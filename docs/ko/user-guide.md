# Verbis3D 사용자 설명서

이 문서는 빈 웹 페이지에서 시작해 3D 객체를 이동하고, 실제 메시 모양을 바꾸고, 검증된
명령으로 제어하는 가장 짧은 사용 경로를 설명합니다. 기준 버전은 저장소의
`0.4.0-alpha.1` 소스 릴리스이며 npm에 게시됐다고 가정하지 않습니다.

[English user manual](../user-guide.md)

## 사용 목적에 맞는 시작점

| 하고 싶은 일        | 권장 시작점                                                   |
| ------------------- | ------------------------------------------------------------- |
| 코드 없이 기능 확인 | [Playground](../../site/playground.html)에서 **Builder** 선택 |
| 객체 이동 학습      | **Move · rotate · scale lab** 프리셋                          |
| 모양 변형 학습      | **Bend · twist · reshape lab** 프리셋                         |
| 웹 앱 개발          | TypeScript 공개 API                                           |
| AI 모델 연결        | `AIProvider`에서 구조화 명령 반환                             |

Playground는 정적 사이트로 동작합니다. 기본 `RuleBasedProvider`는 API 키나 외부 서버가
필요하지 않습니다.

## 1. 설치와 실행

Node.js 20 이상과 WebGL2를 지원하는 브라우저가 필요합니다.

```bash
git clone https://github.com/leondic1976/Deploy-Verbis3d.git
cd Deploy-Verbis3d
npm ci
npm run typecheck
npm run test
npm run site:dev
```

Vite가 출력한 로컬 주소를 여십시오. npm 공개 전 다른 로컬 프로젝트에서 시험하려면
`npm run build`, `npm pack`을 실행하고 생성된 압축 패키지를 그 프로젝트에 설치합니다.

## 2. Canvas와 첫 장면 만들기

Canvas에 실제 CSS 크기를 지정해야 합니다. 너비나 높이가 0이면 렌더링할 수 없습니다.

```html
<canvas id="stage" aria-label="대화형 3D 장면"></canvas>
<style>
  #stage {
    width: 100%;
    height: 32rem;
    display: block;
  }
</style>
```

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
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("#stage canvas가 없습니다.");

const renderer = new WebGL2Renderer({ canvas, maxDevicePixelRatio: 2 });
const scene = new Scene();
scene.background.set(0.025, 0.045, 0.065, 1);

const camera = new PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 1.5, 5);
camera.lookAt({ x: 0, y: 0, z: 0 });

const cube = new Mesh(new BoxGeometry(), new BasicMaterial({ color: [0.2, 0.7, 1, 1] }));
cube.name = "cube";
scene.add(cube);

const engine = new Engine({ renderer, scene, camera });
engine.onUpdate((deltaTime) => cube.rotateY(deltaTime));
engine.start();
```

화면 크기가 바뀌면 `renderer.setSize(width, height, false)`와
`camera.resize(width, height)`를 함께 호출합니다. 화면을 완전히 제거할 때는 ResizeObserver를
끊고 `engine.dispose()`로 애니메이션 프레임과 GPU 자원을 해제합니다.

## 3. 객체 이동과 모양 변경 구분하기

두 작업은 서로 다른 문제를 해결합니다.

| 기능                      | 바뀌는 대상    | 사용 목적                 |
| ------------------------- | -------------- | ------------------------- |
| `position`                | 객체 원점      | 객체 전체 이동            |
| `rotation` / `quaternion` | 객체 방향      | 객체 전체 회전            |
| `scale`                   | 객체 좌표계    | 객체 전체 또는 축별 크기  |
| `mesh.deformation`        | 로컬 정점 위치 | 휘기, 비틀기, 실루엣 변경 |

```ts
cube.position.set(2, 1, -3);
cube.rotation.set(0, Math.PI / 4, 0);
cube.scale.set(1, 1.5, 1);
```

엔진 내부 각도는 라디안입니다. 부모를 이동하면 자식이 함께 움직이고, 자식 부품을 변경하면
부모 좌표계를 기준으로 그 부품만 바뀝니다.

곡선을 눈에 띄게 표현하려면 `SphereGeometry`처럼 정점 구간이 충분한 메시를 사용합니다.

```ts
import { BasicMaterial, Mesh, SphereGeometry } from "@verbis3d/core";

const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);
sculpture.name = "sculpture";
scene.add(sculpture);

sculpture.deformation.configure({
  axis: "y",
  stretch: 1.6,
  bend: Math.PI * 0.4,
  twist: Math.PI,
  taper: 0.45,
  waveAmplitude: 0.08,
  waveFrequency: 2,
});
```

변형은 늘이기 → 휘기 → 비틀기 → 테이퍼 → 물결 순서로 적용됩니다. 슬라이더나 애니메이션을
반복해도 오차가 누적되지 않도록 매번 저장된 기준 정점에서 다시 계산합니다. 이후 법선,
바운딩 볼륨, 기존 WebGL2 버퍼를 갱신합니다.

- `sculpture.resetDeformation()`은 저장된 기준 모양으로 되돌립니다.
- `sculpture.deformation.captureBase()`는 현재 모양을 새 기준으로 확정합니다.
- `sculpture.deformation.snapshot()`은 현재 변형 설정을 데이터로 반환합니다.

## 4. 이동과 모양을 함께 애니메이션하기

```ts
import { AnimationClip, AnimationMixer, NumberKeyframeTrack } from "@verbis3d/core";

const clip = new AnimationClip("move-and-twist", [
  new NumberKeyframeTrack("position.x", [0, 1.5, 3], [-1, 1, -1]),
  new NumberKeyframeTrack("deformation.twist", [0, 1.5, 3], [-Math.PI, Math.PI, -Math.PI]),
]);
const mixer = new AnimationMixer(sculpture);
mixer.clipAction(clip).play();
engine.onUpdate((deltaTime) => mixer.update(deltaTime));
```

변형 속성도 검증된 접근자이므로 직접 편집과 애니메이션이 같은 핵심 알고리즘을 사용합니다.

## 5. 안전한 구조화 명령 실행하기

명령은 실행 코드가 아니라 데이터입니다. 사용자나 AI가 만든 입력은 먼저 dry-run으로
검증하십시오.

```ts
import { CommandBus } from "@verbis3d/core";

const commands = new CommandBus(scene);
const bend = {
  version: "1.0",
  command: "deformObject",
  target: { name: "sculpture" },
  parameters: { axis: "y", bend: 90, twist: 120, unit: "degrees" },
} as const;

const preview = commands.execute(bend, { dryRun: true });
if (!preview.success) throw new Error(`${preview.error?.code}: ${preview.error?.message}`);
const result = commands.execute(bend);
```

`CommandValidator`는 모르는 명령, 중복 대상, 잘못된 축, 유한하지 않은 숫자와 안전 범위를 벗어난
값을 차단합니다. 삭제는 `new CommandBus(scene, { allowDelete: true })`로 명시하기 전까지
허용되지 않습니다.

## 6. 자연어와 교체 가능한 AI 사용하기

```ts
import { RuleBasedProvider } from "@verbis3d/core";

const naturalLanguage = engine.useNaturalLanguage({
  provider: new RuleBasedProvider(),
});

await naturalLanguage.execute("큐브를 오른쪽으로 2 이동");
await naturalLanguage.execute("sculpture를 90도 휘어 비틀어");
```

`RuleBasedProvider`는 외부 통신 없이 동일한 결과를 냅니다. 필요하면 `OllamaProvider` 또는
`OpenAICompatibleProvider`로 교체할 수 있습니다. 모든 Provider는 `EngineCommand[]`를
반환해야 하며 AI의 텍스트나 JavaScript를 직접 실행하지 않습니다. 운영 환경의 원격 API 키는
브라우저 번들이 아니라 서버 프록시에 보관하십시오.

## 7. Playground 권장 실습

1. `playground.html?level=advanced&preset=deformation-lab`을 엽니다.
2. 장면 목록에서 **animated-sculpture**를 선택합니다.
3. 개별 값을 확인하기 쉽도록 모션을 일시정지합니다.
4. **Shape deformation**에서 **Bend**, **Twist**, **Taper**, **Wave**를 조절합니다.
5. **Reset shape**으로 기준 정점을 복원합니다.
6. `animated-sculpture를 90도 휘어`를 입력하고 **Validate and run**을 누릅니다.
7. 구조화 명령 미리보기와 성공 또는 오류 결과를 확인합니다.

Playground는 키보드 포커스, 연결된 label, 모바일 레이아웃, reduced-motion 환경을 지원하며
Canvas에는 대체 설명이 있습니다.

## 8. 문제 해결

| 증상                             | 확인할 내용                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `WebGL2 is required`             | 하드웨어 가속을 켜거나 WebGL2 지원 브라우저·기기를 사용합니다      |
| Canvas가 비어 있거나 작음        | CSS 너비·높이를 지정하고 `setSize`를 호출합니다                    |
| 휘어진 면이 각져 보임            | 변형은 기존 정점을 이동하므로 구간이 더 많은 Geometry를 사용합니다 |
| 대상을 찾을 수 없음              | 객체에 고유한 `name`을 지정하고 정확한 이름을 사용합니다           |
| 대상이 모호함                    | 같은 이름의 객체를 바꿉니다. 엔진은 임의로 선택하지 않습니다       |
| 모양 애니메이션이 느림           | 정점 수나 동시에 CPU 변형하는 메시 수를 줄입니다                   |
| JSON 로드 후 이전 기준 복원 불가 | 알파 JSON은 구워진 모양을 보존하므로 로드 후 새 기준을 캡처합니다  |

## 현재 제한사항

현재는 중간 규모 대화형 메시를 위한 결정적 CPU 변형을 제공합니다. 스켈레탈 스키닝,
소프트바디 물리, 조각 브러시, glTF morph target, GPU/WebGPU compute 변형은 아직 포함하지
않습니다. 자세한 내용은 [메시 변형 참고서](mesh-deformation.md),
[전체 예제](../../examples/mesh-deformation/index.ts), [API 개요](../api/README.md)를 참고하십시오.
