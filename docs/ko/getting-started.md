# 처음부터 회전하는 큐브까지

이 문서는 저장소를 받은 뒤 실제 WebGL2 장면을 띄우고, 크기 변경과 종료 처리까지 연결하는
가장 짧은 완성 경로를 설명합니다.

## 1. 요구 환경

- Node.js 20 이상
- WebGL2와 ES Module을 지원하는 최신 브라우저
- 0보다 큰 CSS 너비·높이를 가진 `<canvas>`

현재 npm 배포는 릴리스 범위가 아닙니다. 저장소 소스를 직접 실행하려면 다음 명령을
사용합니다.

```bash
git clone https://github.com/leondic1976/Deploy-Verbis3d.git
cd Deploy-Verbis3d
npm ci
npm run typecheck
npm run test
npm run site:dev
```

로컬 패키지로 시험하려면 `npm run build && npm pack`으로 생성한 `.tgz` 파일을 다른
프로젝트에서 `npm install 경로/verbis3d-core-0.2.0-alpha.1.tgz`로 설치할 수 있습니다.

## 2. HTML과 CSS

```html
<canvas id="stage" aria-label="Verbis3D 예제 장면"></canvas>
```

```css
#stage {
  display: block;
  width: 100%;
  height: 520px;
}
```

canvas의 CSS 크기와 GPU 렌더링 버퍼 크기는 다릅니다. 아래 코드에서
`renderer.setSize()`가 기기 픽셀 비율을 고려해 실제 버퍼를 맞춥니다.

## 3. 장면 코드

```ts
import {
  BasicMaterial,
  BoxGeometry,
  Engine,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGL2Renderer,
} from "@verbis3d/core";

const canvas = document.querySelector("#stage");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("#stage canvas가 필요합니다.");
}

const renderer = new WebGL2Renderer({
  canvas,
  antialias: true,
  maxDevicePixelRatio: 2,
});
const scene = new Scene();
scene.background.set(0.025, 0.045, 0.065, 1);

const camera = new PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 1.5, 5);
camera.lookAt({ x: 0, y: 0, z: 0 });

const cube = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
cube.name = "cube";
scene.add(cube);

const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => {
  cube.rotateY(deltaTime);
});
```

객체 이름은 자연어 명령과 선택 명령의 대상이 되므로 장면 안에서 고유하게 지정하는 것이
좋습니다. 내부 각도는 라디안입니다. 위 코드에서 `deltaTime`은 초 단위이므로 초당 약
1라디안씩 회전합니다.

## 4. 반응형 크기 처리

```ts
const resize = () => {
  const { width, height } = canvas.getBoundingClientRect();
  if (width <= 0 || height <= 0) return;
  renderer.setSize(width, height, false);
  camera.resize(width, height);
};

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvas);
resize();
engine.start();
```

`Engine.start()`를 여러 번 호출해도 중복 프레임 루프를 만들지 않습니다.

## 5. 종료 처리

SPA 화면 전환이나 canvas 제거 시 다음 정리를 수행합니다.

```ts
const dispose = () => {
  resizeObserver.disconnect();
  cube.dispose();
  engine.dispose();
};
```

`engine.dispose()`는 프레임 예약을 취소하고 renderer의 GPU 리소스를 해제합니다. 같은
객체를 다시 사용하려면 dispose하지 말고 `engine.pause()`와 `engine.resume()`을
사용합니다.

## 6. 문제가 생겼을 때

- **WebGL2 context 오류**: 브라우저의 하드웨어 가속과 WebGL2 지원 여부를 확인합니다.
- **빈 화면**: canvas 크기, 카메라 위치, `near/far`, 객체의 `visible`을 확인합니다.
- **찌그러진 화면**: resize 때 `renderer.setSize()`와 `camera.resize()`를 모두
  호출했는지 확인합니다.
- **회전 속도가 기기마다 다름**: 프레임 수가 아니라 `deltaTime`을 곱합니다.
- **GPU 리소스 누수**: 화면을 제거할 때 객체 또는 엔진의 `dispose()`를 호출합니다.
