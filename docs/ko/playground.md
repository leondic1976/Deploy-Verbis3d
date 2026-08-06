# Playground 실습 안내

배포 사이트의 Scene Lab은 실제 Verbis3D 공개 API로 동작하며 외부 서버 없이도 사용할 수
있습니다.

첫 화면 상단에서 두 작업 중 하나를 선택합니다.

- **Scene editor**: 기존 객체 생성, 변형, 애니메이션, 자연어 명령 작업
- **Photos → 3D**: 여러 사진을 인식하고 하나의 3D 메시로 만드는 단계별 작업

## 여러 사진으로 3D 객체 만들기

1. `Photos → 3D`를 선택합니다.
2. 같은 객체를 촬영한 PNG, JPEG 또는 WebP 사진을 2장 이상 추가합니다.
3. 각 사진을 촬영한 방향을 Front, Left side, Right side, Top 등으로 지정합니다.
4. Vision provider를 선택합니다.
   - Offline silhouette: 사진을 업로드하지 않는 브라우저 기준 구현
   - Ollama vision: 로컬 멀티모달 모델
   - OpenAI-compatible vision API: 설정한 호환 endpoint
5. Surface detail과 Depth refinement, 사진 색상 투영 여부를 선택합니다.
6. `Create 3D object`를 실행합니다. 중단하려면 `Cancel`을 누릅니다.
7. 인식 이름, 신뢰도, depth view, 색상 투영률과 삼각형 수를 확인한 후 `Edit in scene`으로
   편집을 계속합니다.

최소한 정면과 측면처럼 서로 수직인 두 방향이 필요합니다. 배경이 단순하고 객체와 대비가
클수록 오프라인 인식 결과가 좋아집니다. `Use demo views`는 미리 만든 3D 객체를 불러오는
것이 아니라 브라우저에서 예제 사진을 만들고 실제 인식·메시 생성 파이프라인을 실행합니다.

현재 결과는 실루엣과 선택적 depth를 사용하는 visual hull입니다. 기본 depth는 실루엣
경계에서 계산한 형태 근사이며 실제 거리 측정값이 아닙니다. 사진 색상은 vertex color로
투영되며 UV 텍스처 아틀라스는 아닙니다. 전문 인식 AI, `VisionAnalysisEnhancer` 기반 깊이·
카메라 포즈 AI와 독립 `VisionMeshGenerator`를 조합할 수 있습니다. 보이지 않는 오목한 부분,
NeRF, Gaussian splatting, 자동 리토폴로지는 포함하지 않습니다.

## 10분 학습 순서

1. Beginner에서 hierarchy의 `cube`를 선택합니다.
2. Inspector의 Position X를 `1.5`로 바꿉니다.
3. viewport를 드래그해 시점을 돌리고 휠로 확대합니다.
4. `선택한 객체를 위로 1 이동`을 실행합니다.
5. Builder에서 Car 또는 Face bust를 추가합니다.
6. 루트 객체를 선택해 전체를 이동·회전·확대합니다.
7. 루트를 펼쳐 wheel, window, eye, mouth 같은 부품을 따로 선택합니다.
8. Advanced의 `Move · rotate · stretch lab` 프리셋을 불러옵니다.
9. Expert에서 생성된 `EngineCommand`와 JSON 장면을 확인합니다.

## 선택과 카메라

- 객체 목록 클릭: 정확한 노드 선택
- viewport 클릭: bounding box ray picking으로 앞쪽 부품 선택
- 일반 드래그: 카메라 orbit
- Shift/가운데/오른쪽 드래그: pan
- 휠 또는 두 손가락: zoom
- Front/Top/Perspective: 시점 전환
- Frame selected: 선택 객체 또는 복합 모델 전체를 화면에 맞춤

복합 모델 루트를 선택하면 marker가 자식 전체 bounds의 중앙에 나타납니다.

## 객체 만들기와 변형하기

Builder의 Add object에는 Box, Sphere, Plane, Group과 Car, Face bust가 있습니다. 자동차는
22개, 얼굴은 18개 선택 가능한 부품으로 구성됩니다.

- Position: 부모 기준 위치
- Rotation: UI에서는 도 단위, 엔진 내부에서는 라디안
- Scale: 축별 배율
- Reset transform: 위치·회전·크기를 기본값으로 복원
- Duplicate/Delete: 선택 계층 복제 또는 제거
- Parent: 순환 참조를 막으면서 계층 변경

## 실습 프리셋

- Starter composition: 큐브, 구, 바닥
- Move · rotate · stretch lab: 위치·회전·비균일 scale 비교
- Material gallery: 여러 색과 도형
- Orbital hierarchy: 부모·자식과 motion
- Procedural car workshop: 전체 자동차와 22개 부품
- Procedural face study: 얼굴 루트와 표정 부품
- 25-object stress grid: draw-call 진단

## 자연어로 복합 모델 만들기

```text
파란 자동차를 만들어 오른쪽으로 2 이동하고 30도 회전
사람 얼굴을 만들어 두 배로 키워
자동차를 만들어 천천히 회전시켜
선택한 객체를 숨겨
```

명령 아래의 preview에서 구조화된 데이터가 어떻게 만들어졌는지 확인할 수 있습니다.
처음에는 Offline rules를 사용하고, 자유 문장이 필요할 때만 Ollama 또는 호환 Provider를
설정하는 것이 좋습니다.

## 저장, 되돌리기, 안전

- Undo/Redo는 제한된 수의 장면 JSON snapshot을 사용합니다.
- Export/Import는 버전이 있는 JSON 데이터와 검증된 사용자 BufferGeometry만 처리합니다.
- API 키는 브라우저 storage나 장면 JSON에 저장하지 않습니다.
- Offline silhouette은 사진을 외부로 전송하지 않습니다. 원격 Vision provider는 입력한
  endpoint로 선택 사진을 전송하므로 해당 서비스의 보관 정책을 먼저 확인해야 합니다.
- 생성된 텍스트나 JavaScript는 실행하지 않습니다.
- 삭제와 범위 초과 명령은 Command Bus에서 차단됩니다.
