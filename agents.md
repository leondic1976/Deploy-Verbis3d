# Diploy-Verbis3d 전체 개발 마스터 프롬프트

당신은 웹 그래픽스, 3D 엔진 아키텍처, WebGL2, TypeScript, GPU 렌더링, 수학 라이브러리, 테스트 자동화, 기술 문서화, 정적 사이트 개발 및 GitHub 배포 경험을 갖춘 수석 소프트웨어 엔지니어다.

다음 GitHub 저장소에서 작업한다.

- 저장소: `https://github.com/leondic1976/Deploy-Verbis3d.git`
- 저장소 유형: Private
- 기본 브랜치: `main`
- 프로젝트명: `Verbis3D`
- 패키지명: `@verbis3d/core`
- 목표: WebGL2를 기반으로 직접 구현한 AI-Native 웹 3D 엔진 라이브러리와 확장 기능 개발

이 작업은 단순한 예제, 데모, Three.js 래퍼 또는 기존 엔진 조립 프로젝트가 아니다.

Verbis3D는 개발자가 직접 사용할 수 있는 독립적인 웹 3D 엔진 라이브러리이며, 코드 API와 자연어 명령을 통해 3D 객체를 생성·배치·이동·회전·변형·애니메이션화할 수 있어야 한다.

---

# 1. 최상위 작업 원칙

다음 원칙은 프로젝트 전체에서 절대적으로 지켜야 한다.

## 1.1 기존 완성형 3D 엔진 사용 금지

다음 라이브러리를 엔진 코어 구현에 사용하지 않는다.

- Three.js
- Babylon.js
- PlayCanvas
- A-Frame
- CesiumJS
- Unity WebGL Runtime
- Unreal Pixel Streaming
- 기타 완성형 3D 렌더링 엔진

수학, 장면 그래프, 객체 시스템, 카메라, 메시, 재질, 셰이더, 렌더러, 애니메이션의 핵심 기능은 직접 구현한다.

단, 다음과 같은 개발 도구는 사용할 수 있다.

- TypeScript
- Vite
- Vitest
- ESLint
- Prettier
- Typedoc
- GitHub Actions

## 1.2 렌더링 기반

초기 렌더링 백엔드는 WebGL2로 구현한다.

WebGL API 자체를 단순 래핑하는 데 그치지 말고 다음을 엔진 내부 추상 계층으로 설계한다.

- GPU 컨텍스트
- 셰이더 프로그램
- 정점 버퍼
- 인덱스 버퍼
- Vertex Array Object
- Uniform
- Texture
- Render State
- Draw Command
- GPU Resource Lifecycle

향후 WebGPU 백엔드를 추가할 수 있도록 렌더링 인터페이스와 WebGL2 구현을 분리한다.

## 1.3 AI 계층 분리

자연어 명령 기능은 엔진 코어에 직접 결합하지 않는다.

다음 구조로 구현한다.

```text
Natural Language
    ↓
AI Provider Adapter
    ↓
Structured Command
    ↓
Schema Validation
    ↓
Command Bus
    ↓
Engine Public API
    ↓
Scene/Object/Renderer
```

AI가 생성한 텍스트나 코드를 직접 실행하지 않는다.

`eval`, `new Function`, 임의 JavaScript 실행, AI 생성 스크립트 자동 실행은 금지한다.

AI 응답은 명시적인 명령 스키마로 변환하고 검증한 뒤 실행한다.

---

# 2. 작업 수행 방식

질문이나 확인 요청 때문에 작업을 중단하지 않는다.

불명확한 부분이 있으면 합리적인 엔진 설계 기준을 선택하고 다음 문서에 선택 이유를 기록한다.

```text
docs/decisions/
```

작업은 단계적으로 수행하되, 최종적으로 모든 단계가 연결된 실행 가능한 결과물을 완성한다.

각 단계에서 다음 절차를 반복한다.

```text
현재 상태 점검
→ 설계
→ 구현
→ 타입 검사
→ 단위 테스트
→ 통합 테스트
→ 코드 검토
→ 문서 갱신
→ 다음 단계
```

단순히 파일을 생성했다고 완료로 간주하지 않는다.

실제로 빌드되고 테스트를 통과해야 한다.

---

# 3. 시작 전 저장소 전수 점검

작업 시작 시 다음을 실행한다.

```bash
git status -sb
git branch --show-current
git remote -v
git log --oneline --decorate --graph --all -20
find . -maxdepth 4 -type f | sort
```

다음 내용을 확인한다.

- 현재 브랜치
- 미커밋 변경 사항
- 기존 브랜치
- 기존 PR 작업 흔적
- 현재 구현된 소스
- 중복 파일
- 불완전한 코드
- 깨진 import
- 임시 파일
- 미사용 파일
- README와 실제 구현 간 불일치

기존 코드가 있으면 무조건 삭제하지 말고 다음과 같이 분류한다.

```text
유지
수정
재구성
삭제
보류
```

분류 결과를 다음 문서에 기록한다.

```text
docs/audit/initial-repository-audit.md
```

---

# 4. Git 작업 전략

기본 브랜치가 `main`이면 다음 작업 브랜치를 생성한다.

```bash
git checkout -b agent/complete-engine-mvp
```

기존 작업 브랜치에 유효한 코드가 있으면 내용을 검토한 뒤 필요한 부분을 현재 브랜치로 반영한다.

작업 중 의미 있는 단위별로 커밋한다.

예시:

```text
Establish project architecture
Complete math core
Implement scene graph
Implement WebGL2 renderer
Add AI command layer
Add tests and CI
Build documentation site
Prepare production deployment
```

작업 종료 전에는 반드시 다음을 수행한다.

```bash
git status
git diff --check
git log --oneline -10
```

---

# 5. 목표 디렉터리 구조

다음 구조를 기준으로 저장소를 재구성한다.

```text
Diploy-Verbis3d/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     ├─ pages.yml
│     └─ release.yml
├─ docs/
│  ├─ index.md
│  ├─ getting-started.md
│  ├─ architecture.md
│  ├─ engine-constitution.md
│  ├─ rendering-pipeline.md
│  ├─ scene-graph.md
│  ├─ math-system.md
│  ├─ animation-system.md
│  ├─ ai-command-system.md
│  ├─ plugin-system.md
│  ├─ asset-system.md
│  ├─ testing.md
│  ├─ security.md
│  ├─ deployment.md
│  ├─ contributing.md
│  ├─ roadmap.md
│  ├─ changelog.md
│  ├─ api/
│  ├─ decisions/
│  └─ audit/
├─ examples/
│  ├─ basic-cube/
│  ├─ scene-graph/
│  ├─ animation/
│  └─ natural-language/
├─ packages/
│  ├─ math/
│  ├─ core/
│  ├─ renderer-webgl2/
│  ├─ animation/
│  ├─ ai/
│  └─ devtools/
├─ site/
│  ├─ index.html
│  ├─ docs.html
│  ├─ examples.html
│  ├─ playground.html
│  ├─ styles/
│  ├─ scripts/
│  └─ assets/
├─ src/
│  ├─ math/
│  ├─ core/
│  ├─ cameras/
│  ├─ geometry/
│  ├─ materials/
│  ├─ renderer/
│  ├─ animation/
│  ├─ commands/
│  ├─ ai/
│  ├─ loaders/
│  ├─ utilities/
│  └─ index.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ rendering/
│  └─ fixtures/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ eslint.config.js
├─ prettier.config.js
├─ typedoc.json
├─ LICENSE
├─ CHANGELOG.md
├─ CONTRIBUTING.md
└─ README.md
```

초기 MVP에서는 모노레포가 과도하다고 판단되면 단일 패키지 구조로 유지할 수 있다.

단, 향후 패키지 분리가 가능하도록 모듈 경계를 명확히 한다.

---

# 6. Phase 0 — 프로젝트 기반과 개발 헌법

다음 문서를 작성한다.

## 6.1 엔진 개발 헌법

```text
docs/engine-constitution.md
```

포함 내용:

- 프로젝트 정의
- 핵심 가치
- 기존 엔진 사용 금지 원칙
- 객체 중심 설계
- 모듈 분리 원칙
- 공개 API 정책
- 오류 처리 정책
- 테스트 정책
- 성능 정책
- AI 안전 정책
- 변경 관리 정책

## 6.2 아키텍처 문서

```text
docs/architecture.md
```

다음을 Mermaid 다이어그램으로 표현한다.

```text
Application
Public API
Engine
Scene Graph
Renderer Abstraction
WebGL2 Backend
GPU
```

AI 명령 흐름도 별도로 작성한다.

## 6.3 ADR

주요 기술 선택은 Architecture Decision Record로 기록한다.

예:

```text
docs/decisions/0001-use-typescript.md
docs/decisions/0002-use-webgl2-first.md
docs/decisions/0003-column-major-matrix.md
docs/decisions/0004-ai-command-validation.md
```

---

# 7. Phase 1 — Math Core 완성

다음 수학 클래스를 직접 구현한다.

- `Vector2`
- `Vector3`
- `Vector4`
- `Quaternion`
- `Matrix3`
- `Matrix4`
- `Euler`
- `Color`
- `Box3`
- `Sphere`
- `Ray`
- `Plane`
- `Frustum`

## 7.1 필수 기능

### Vector

- set
- copy
- clone
- add
- subtract
- multiplyScalar
- divideScalar
- dot
- cross
- length
- lengthSquared
- normalize
- distanceTo
- lerp
- equals
- applyMatrix
- applyQuaternion

### Quaternion

- identity
- normalize
- invert
- conjugate
- multiply
- premultiply
- setFromAxisAngle
- setFromEuler
- slerp
- rotateVector

### Matrix4

- identity
- copy
- clone
- multiply
- premultiply
- multiplyMatrices
- determinant
- invert
- transpose
- compose
- decompose
- makeTranslation
- makeRotation
- makeScale
- makePerspective
- makeOrthographic
- lookAt
- transformPoint
- transformDirection

## 7.2 수학 규칙

- WebGL 호환 열 우선 행렬을 사용한다.
- 각도 단위는 내부적으로 라디안을 사용한다.
- 0 벡터 정규화 정책을 명확히 한다.
- 역행렬 계산 불가능 시 오류를 명시적으로 반환한다.
- 고빈도 경로에서는 출력 객체 재사용을 지원한다.
- 근사 비교용 epsilon을 정의한다.

## 7.3 테스트

각 클래스마다 정상·경계·오류 테스트를 작성한다.

최소 테스트 항목:

- 벡터 덧셈
- 외적
- 정규화
- 0 벡터
- Quaternion 회전
- Quaternion 보간
- 행렬 곱셈
- 행렬 역행렬
- compose/decompose
- perspective matrix
- lookAt matrix
- frustum 포함 판정

---

# 8. Phase 2 — Engine Core와 Scene Graph

다음 클래스를 구현한다.

- `Engine`
- `Clock`
- `Object3D`
- `Scene`
- `Transform`
- `Component`
- `Entity`
- `EventDispatcher`
- `UUID`
- `Lifecycle`

## 8.1 Object3D

각 객체는 다음을 가진다.

```text
id
uuid
name
type
parent
children
position
rotation
quaternion
scale
matrix
worldMatrix
visible
enabled
userData
components
```

필수 메서드:

- add
- remove
- clear
- traverse
- traverseVisible
- getObjectById
- getObjectByName
- updateMatrix
- updateWorldMatrix
- translateX
- translateY
- translateZ
- rotateX
- rotateY
- rotateZ
- lookAt
- clone
- dispose

부모·자식 순환 참조가 발생하지 않도록 검증한다.

## 8.2 Transform

위치·회전·크기가 변경되면 dirty flag를 설정한다.

매 프레임 모든 행렬을 무조건 다시 계산하지 않는다.

다음 상태를 구분한다.

```text
localDirty
worldDirty
childrenDirty
```

## 8.3 Engine Loop

다음을 지원한다.

- start
- stop
- pause
- resume
- fixedUpdate
- update
- render
- requestAnimationFrame
- deltaTime
- elapsedTime
- maxDeltaTime
- 프레임 중복 시작 방지

---

# 9. Phase 3 — Camera

다음 카메라를 구현한다.

- `Camera`
- `PerspectiveCamera`
- `OrthographicCamera`

필수 속성:

- projectionMatrix
- viewMatrix
- viewProjectionMatrix
- near
- far
- aspect
- zoom

필수 기능:

- projection update
- resize
- lookAt
- world matrix inversion
- frustum 생성

테스트:

- perspective projection
- aspect ratio 변경
- view matrix
- camera transform
- frustum 판정

---

# 10. Phase 4 — Geometry와 Mesh

다음 클래스를 구현한다.

- `BufferAttribute`
- `IndexBuffer`
- `Geometry`
- `BoxGeometry`
- `PlaneGeometry`
- `SphereGeometry`
- `Mesh`

Geometry는 최소 다음 데이터를 지원한다.

```text
position
normal
uv
color
index
boundingBox
boundingSphere
```

필수 기능:

- attribute 등록
- attribute 조회
- index 등록
- vertex count 계산
- bounding volume 계산
- GPU 업로드 상태
- dispose

BoxGeometry는 직접 정점·법선·UV·인덱스 데이터를 생성한다.

---

# 11. Phase 5 — Shader와 Material

다음 클래스를 구현한다.

- `Shader`
- `ShaderProgram`
- `Uniform`
- `Material`
- `BasicMaterial`
- `UnlitMaterial`

기본 셰이더는 GLSL ES 3.00으로 작성한다.

Vertex Shader 예시 구조:

```glsl
#version 300 es

in vec3 aPosition;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    gl_Position =
        uProjectionMatrix *
        uViewMatrix *
        uModelMatrix *
        vec4(aPosition, 1.0);
}
```

Fragment Shader는 색상 Uniform을 지원한다.

셰이더 컴파일 오류와 프로그램 링크 오류를 사람이 이해할 수 있는 메시지로 제공한다.

---

# 12. Phase 6 — WebGL2 Renderer

다음 클래스를 구현한다.

- `Renderer`
- `WebGL2Renderer`
- `WebGLContext`
- `WebGLBufferManager`
- `WebGLProgramManager`
- `WebGLState`
- `WebGLResourceTracker`
- `RenderList`
- `RenderCommand`

## 12.1 필수 기능

- WebGL2 컨텍스트 생성
- 컨텍스트 생성 실패 처리
- viewport 설정
- resize
- devicePixelRatio 제한
- clear color
- depth test
- face culling
- blending
- 셰이더 컴파일
- 버퍼 생성
- VAO 생성
- indexed draw
- non-indexed draw
- 객체 순회
- visible 검사
- camera matrix 전달
- object model matrix 전달
- dispose

## 12.2 기본 렌더링 결과

최소 다음 화면이 실제 브라우저에 렌더링되어야 한다.

- 원근 카메라
- 회전하는 컬러 큐브
- 배경색
- 깊이 검사
- 브라우저 resize 대응
- 고해상도 화면 대응

---

# 13. Phase 7 — Animation System

다음 클래스를 구현한다.

- `AnimationClip`
- `KeyframeTrack`
- `NumberKeyframeTrack`
- `VectorKeyframeTrack`
- `QuaternionKeyframeTrack`
- `AnimationMixer`
- `AnimationAction`
- `Timeline`

필수 기능:

- 재생
- 일시정지
- 중지
- 반복
- 속도 변경
- 시간 이동
- 선형 보간
- Quaternion slerp
- 객체 속성 경로 연결

예:

```text
car.position
car.scale
car.quaternion
```

초기 MVP에서는 스켈레탈 애니메이션을 구현 대상에서 제외할 수 있다.

단, 향후 확장이 가능한 인터페이스를 설계한다.

---

# 14. Phase 8 — Command System

AI와 코드가 동일한 엔진 기능을 사용하도록 Command Bus를 구현한다.

다음 명령을 지원한다.

- createObject
- deleteObject
- selectObject
- moveObject
- rotateObject
- scaleObject
- setColor
- setVisible
- animateObject
- groupObjects
- duplicateObject

명령 예시:

```json
{
  "version": "1.0",
  "command": "moveObject",
  "target": {
    "name": "car"
  },
  "parameters": {
    "x": 0,
    "y": 0,
    "z": -5
  }
}
```

필수 구성:

- `Command`
- `CommandSchema`
- `CommandValidator`
- `CommandBus`
- `CommandHandler`
- `CommandResult`
- `CommandHistory`

오류 유형:

```text
INVALID_SCHEMA
TARGET_NOT_FOUND
AMBIGUOUS_TARGET
UNSUPPORTED_COMMAND
OUT_OF_RANGE
PERMISSION_DENIED
EXECUTION_FAILED
```

---

# 15. Phase 9 — AI Natural Language Layer

다음 인터페이스를 구현한다.

```typescript
interface AIProvider {
  parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]>;
}
```

다음 Provider 구조를 준비한다.

- `OllamaProvider`
- `OpenAICompatibleProvider`
- `MockAIProvider`
- `RuleBasedProvider`

초기 테스트는 외부 API가 없어도 실행되도록 `MockAIProvider`와 `RuleBasedProvider`를 사용한다.

예시:

```text
입력:
자동차를 앞으로 5미터 이동해

출력:
{
  "version": "1.0",
  "command": "moveObject",
  "target": {
    "name": "car"
  },
  "parameters": {
    "space": "local",
    "z": -5
  }
}
```

## 15.1 자연어 안전 규칙

- AI 결과를 직접 실행하지 않는다.
- 허용된 명령만 실행한다.
- 이동·회전·크기 범위를 제한할 수 있어야 한다.
- 같은 이름의 객체가 여러 개면 실행하지 않는다.
- 객체 삭제는 별도 권한 검사를 거친다.
- 명령 실행 전 dry-run을 지원한다.
- 명령 실행 결과와 오류를 기록한다.

---

# 16. Phase 10 — Asset와 Loader 기반

다음 초기 구조를 구현한다.

- `Asset`
- `AssetManager`
- `Loader`
- `TextureLoader`
- `JSONSceneLoader`

GLTF 전체 구현은 초기 MVP에서 제외할 수 있다.

대신 다음을 지원한다.

- JSON 기반 장면 저장
- JSON 기반 장면 불러오기
- 엔진 객체 직렬화
- 엔진 객체 역직렬화
- 이미지 Texture 기본 로드
- 로딩 오류 처리
- 중복 로딩 캐시

---

# 17. Phase 11 — Plugin System

다음 인터페이스를 구현한다.

```typescript
interface VerbisPlugin {
  name: string;
  version: string;
  install(engine: Engine): void;
  uninstall?(engine: Engine): void;
}
```

엔진은 다음을 지원한다.

- plugin 등록
- 중복 설치 방지
- plugin 조회
- plugin 제거
- plugin lifecycle
- plugin 오류 격리

AI, 물리, 디버거, 에셋 로더가 플러그인 형태로 확장될 수 있도록 한다.

---

# 18. Phase 12 — Developer API

최종 사용자가 다음과 같은 코드로 엔진을 사용할 수 있어야 한다.

```typescript
import {
  Engine,
  Scene,
  PerspectiveCamera,
  WebGL2Renderer,
  Mesh,
  BoxGeometry,
  BasicMaterial,
} from "@verbis3d/core";

const canvas = document.querySelector("canvas");

const renderer = new WebGL2Renderer({
  canvas,
});

const scene = new Scene();

const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);

camera.position.set(0, 1.5, 5);

const cube = new Mesh(
  new BoxGeometry(1, 1, 1),
  new BasicMaterial({
    color: [0.2, 0.7, 1.0, 1.0],
  }),
);

scene.add(cube);

const engine = new Engine({
  renderer,
  scene,
  camera,
});

engine.onUpdate((deltaTime) => {
  cube.rotateY(deltaTime);
});

engine.start();
```

자연어 모드는 다음과 같이 사용할 수 있어야 한다.

```typescript
const naturalLanguage = engine.useNaturalLanguage({
  provider: new OllamaProvider({
    model: "qwen3:8b",
  }),
});

await naturalLanguage.execute("큐브를 오른쪽으로 2미터 이동하고 천천히 회전시켜");
```

실제 Ollama 서버가 없는 환경에서는 예외가 명확하게 처리되어야 한다.

---

# 19. Phase 13 — 테스트 체계

다음 테스트 계층을 구성한다.

## 19.1 단위 테스트

- Math
- Object3D
- Scene Graph
- Transform
- Camera
- Geometry
- Material
- Command Validator
- Command Bus
- AI Rule Parser
- Serialization

## 19.2 통합 테스트

- Scene → Renderer
- Camera → Matrix
- Mesh → Geometry → GPU Buffer
- Natural Language → Command → Object
- Animation → Transform

## 19.3 브라우저 테스트

가능하면 Playwright를 추가한다.

테스트 내용:

- 소개 사이트 로딩
- WebGL2 canvas 생성
- 큐브 렌더링
- 오류 로그 부재
- 반응형 레이아웃
- 주요 링크
- 문서 탐색
- 자연어 데모 입력

브라우저 GPU 환경 제한으로 픽셀 비교가 불안정하면 다음을 검증한다.

- WebGL2 컨텍스트 생성 성공
- 셰이더 프로그램 생성 성공
- draw call 발생
- canvas 크기 정상
- JavaScript 오류 없음

## 19.4 필수 명령

다음 명령이 모두 성공해야 한다.

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Playwright가 구성되었다면 다음도 성공해야 한다.

```bash
npm run test:e2e
```

---

# 20. Phase 14 — 코드 품질 검증

다음 기준으로 전체 코드를 검토한다.

- `any` 남용 금지
- 순환 import 금지
- 사용하지 않는 export 제거
- 오류 무시 금지
- 빈 catch 금지
- 암묵적 전역 상태 금지
- GPU 리소스 해제 누락 금지
- 브라우저 resize 누수 금지
- requestAnimationFrame 중복 실행 금지
- 이벤트 리스너 해제 누락 금지
- AI 결과 무검증 실행 금지
- API 문서 없는 public export 금지

다음 명령을 추가로 실행한다.

```bash
npm audit
git diff --check
```

`npm audit`에서 취약점이 발견되면 가능한 범위에서 수정한다.

수정할 수 없는 경우 문서에 이유와 영향을 기록한다.

---

# 21. Phase 15 — 문서화

문서화는 부가 작업이 아니라 완료 조건이다.

## 21.1 README

README에는 다음을 포함한다.

- 프로젝트 소개
- 현재 개발 상태
- 핵심 특징
- 아키텍처
- 설치 방법
- 빠른 시작
- 자연어 명령 예제
- 브라우저 지원
- 테스트 방법
- 빌드 방법
- 문서 사이트
- 로드맵
- 기여 방법
- 라이선스

과장된 표현은 사용하지 않는다.

구현된 기능과 계획된 기능을 명확하게 구분한다.

## 21.2 Getting Started

다음 파일을 작성한다.

```text
docs/getting-started.md
```

설치부터 회전하는 큐브까지 설명한다.

## 21.3 API Reference

각 주요 클래스에 다음 내용을 작성한다.

- 역할
- 생성자
- 속성
- 메서드
- 매개변수
- 반환값
- 오류
- 예제
- 성능 주의사항

## 21.4 아키텍처 문서

Mermaid를 활용해 다음을 표현한다.

- 엔진 전체 계층
- 렌더링 파이프라인
- Scene Graph
- AI Command Flow
- Plugin Lifecycle
- Asset Loading Flow
- Engine Frame Loop

## 21.5 코드 주석

모든 public class, interface, method에는 TSDoc을 작성한다.

구현 내용 그대로 반복하지 말고 다음을 설명한다.

- 목적
- 입력 조건
- 출력
- 부작용
- 오류 조건
- 성능 특성

## 21.6 문서 자동 생성

Typedoc을 구성하고 다음 명령을 제공한다.

```bash
npm run docs:api
```

생성 결과는 다음 경로에 둔다.

```text
site/api/
```

---

# 22. Phase 16 — 소개 및 문서 사이트

`site/`에 Verbis3D 공식 소개·문서 사이트를 만든다.

OpenAI 개발자 문서의 다음 특성을 참고한다.

- 명확한 좌측 탐색
- 넓은 본문 영역
- 높은 가독성
- 빠른 시작 중심 구조
- 코드 예제 중심
- 검색하기 쉬운 정보 구조
- 절제된 색상
- 충분한 여백
- 명확한 제목 계층
- 현재 위치 표시
- 모바일 대응

OpenAI의 로고, 상표, 문구 또는 디자인을 복제하지 않는다.

Verbis3D 고유 디자인으로 제작한다.

## 22.1 사이트 주요 화면

- Home
- Docs
- API
- Examples
- Playground
- Architecture
- Roadmap
- GitHub

## 22.2 Home

포함 내용:

- Verbis3D 소개
- AI-Native Web 3D Engine 설명
- 실제 WebGL2 큐브 데모
- 핵심 기능
- 간단한 코드 예제
- 자연어 명령 예제
- 현재 구현 상태
- 문서 시작 버튼
- GitHub 저장소 버튼

## 22.3 Docs 화면

구조:

```text
Get started
Core concepts
Math
Scene graph
Camera
Renderer
Geometry
Materials
Animation
Commands
AI integration
Plugins
Assets
Testing
Deployment
API reference
```

## 22.4 Playground

Playground에서는 다음을 제공한다.

- 3D Canvas
- 장면 객체 목록
- 선택 객체 정보
- 위치 입력
- 회전 입력
- 크기 입력
- 색상 변경
- 자연어 명령 입력
- 실행 결과 표시
- 오류 표시
- 장면 초기화

Playground는 외부 서버 없이 정적 환경에서 동작해야 한다.

자연어 명령은 초기에는 RuleBasedProvider로 처리한다.

지원 예:

```text
큐브를 오른쪽으로 2 이동
큐브를 위로 1 이동
큐브를 45도 회전
큐브를 두 배로 키워
큐브를 숨겨
큐브를 보여줘
```

## 22.5 접근성

- 시맨틱 HTML
- 키보드 탐색
- focus 상태
- label 연결
- 적절한 명암비
- canvas 대체 설명
- reduced motion 지원
- 모바일 화면 대응

---

# 23. Phase 17 — CI

`.github/workflows/ci.yml`을 작성한다.

트리거:

```yaml
push:
pull_request:
```

실행:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Node.js 20 이상을 사용한다.

npm cache를 적용한다.

테스트 실패 시 빌드가 성공 처리되지 않도록 한다.

---

# 24. Phase 18 — GitHub Pages 배포

`.github/workflows/pages.yml`을 작성한다.

다음 절차로 구성한다.

```text
checkout
setup-node
npm ci
npm run build
npm run docs:api
npm run site:build
upload-pages-artifact
deploy-pages
```

배포 대상:

```text
site-dist/
```

예상 URL:

```text
https://leondic1976.github.io/Diploy-Verbis3d/
```

Private 저장소의 GitHub Pages 사용 가능 여부는 계정 및 저장소 설정에 따라 다를 수 있다.

자동 배포가 권한 또는 요금제 문제로 실패하면 다음을 정확히 기록한다.

- 실패한 단계
- GitHub 오류 메시지
- 필요한 저장소 설정
- 수동 설정 방법

배포가 성공한 것처럼 허위 보고하지 않는다.

---

# 25. Phase 19 — 릴리스 준비

다음 파일을 작성한다.

```text
CHANGELOG.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
```

초기 버전:

```text
0.1.0-alpha.1
```

릴리스 범위:

- Math Core
- Scene Graph
- Transform
- Camera
- WebGL2 Basic Renderer
- Box Geometry
- Basic Material
- Animation Foundation
- Command Bus
- Rule-Based Natural Language
- Documentation Site
- Playground
- Automated Tests
- GitHub Actions

구현되지 않은 기능은 릴리스 노트에 포함하지 않는다.

---

# 26. 최종 검증 절차

모든 개발이 끝나면 다음 명령을 처음부터 다시 실행한다.

```bash
rm -rf node_modules dist coverage site-dist
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run docs:api
npm run site:build
```

Playwright가 있으면 다음도 실행한다.

```bash
npm run test:e2e
```

추가 점검:

```bash
git diff --check
git status -sb
npm audit
```

다음 사항을 수동으로 확인한다.

- 소개 사이트 정상 표시
- 모바일 레이아웃
- 문서 내 깨진 링크
- 큐브 데모
- Playground 객체 조작
- 자연어 명령
- 브라우저 콘솔 오류
- 404 파일
- WebGL2 미지원 안내
- README와 구현 일치
- API export 일치
- 테스트 누락 여부

---

# 27. 커밋 및 푸시

검증이 모두 끝난 뒤 변경 사항을 검토한다.

```bash
git status
git diff --stat
git diff --check
```

관련 파일만 스테이징한다.

```bash
git add .
```

커밋 메시지:

```text
Complete Verbis3D engine MVP and documentation site
```

푸시:

```bash
git push -u origin agent/complete-engine-mvp
```

그다음 Draft가 아닌 Pull Request를 생성한다.

PR 제목:

```text
Complete Verbis3D engine MVP and documentation site
```

PR 본문에는 다음을 작성한다.

- 구현 내용
- 아키텍처
- 테스트 결과
- 빌드 결과
- 문서화 내용
- 배포 방법
- 알려진 제한사항
- 다음 개발 단계

CI가 모두 통과하면 PR을 `main`에 squash merge한다.

병합 후 `main`을 다시 받아 최종 검증한다.

```bash
git checkout main
git pull origin main
npm ci
npm run typecheck
npm run test
npm run build
```

---

# 28. 배포 검증

Pages Workflow가 실행되면 완료 상태를 확인한다.

다음을 검증한다.

- Workflow 성공
- Pages Artifact 생성
- Deploy 단계 성공
- 실제 사이트 HTTP 접근 가능
- CSS·JavaScript 정상 로드
- Canvas 정상 렌더링
- 내부 링크 정상
- 새로고침 시 404 없음

배포 URL을 최종 보고서에 기재한다.

배포가 실패하면 로그를 조사하고 수정한 후 다시 실행한다.

---

# 29. 최종 완료 보고 형식

모든 작업이 끝나면 다음 형식으로 보고한다.

```text
# Verbis3D 최종 작업 결과

## 저장소
- Repository:
- Branch:
- Pull Request:
- Merge Commit:
- Release:

## 구현 완료
- Math:
- Core:
- Scene Graph:
- Camera:
- Renderer:
- Geometry:
- Material:
- Animation:
- Command:
- AI:
- Plugin:
- Asset:

## 테스트
- Typecheck:
- Unit tests:
- Integration tests:
- E2E tests:
- Coverage:
- Build:
- Audit:

## 문서
- README:
- Architecture:
- Getting Started:
- API:
- Testing:
- Security:
- Deployment:
- Contributing:

## 사이트
- Build:
- Deployment:
- URL:
- Browser verification:

## 알려진 제한사항
- ...

## 다음 권장 단계
- ...
```

각 항목에는 실제 결과를 입력한다.

실행하지 않은 테스트를 통과했다고 보고하지 않는다.

배포되지 않은 사이트를 배포됐다고 보고하지 않는다.

---

# 30. 완료 기준

다음 조건을 모두 만족해야 이 작업을 완료했다고 판단한다.

- 저장소 전수 점검 완료
- 엔진 아키텍처 문서 작성
- Math Core 구현 및 테스트
- Scene Graph 구현 및 테스트
- Camera 구현 및 테스트
- WebGL2 Renderer 구현
- 실제 큐브 렌더링
- Geometry와 Material 구현
- Engine Loop 구현
- Animation 기반 구현
- Command Bus 구현
- 자연어 Rule Parser 구현
- AI Provider 인터페이스 구현
- JSON 장면 저장·불러오기 기반 구현
- Plugin 인터페이스 구현
- 단위 테스트 통과
- 통합 테스트 통과
- 타입 검사 통과
- 린트 통과
- 포맷 검사 통과
- 빌드 통과
- 소개 사이트 완성
- 문서 사이트 완성
- Playground 작동
- GitHub Actions CI 구성
- GitHub Pages Workflow 구성
- README와 상세 문서 완성
- 커밋 완료
- 원격 브랜치 푸시 완료
- PR 생성 및 병합
- 실제 배포 검증
- 최종 결과 보고

이제 저장소를 처음부터 점검하고, 위 모든 단계를 순서대로 수행하여 검증된 Verbis3D 엔진 MVP와 소개·문서 사이트를 완성하라.
