# Playground 실습 안내

배포 사이트의 Scene Lab은 실제 Verbis3D 공개 API로 동작하며 외부 서버 없이도 사용할 수
있습니다.

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
- Export/Import는 버전이 있는 JSON 데이터만 처리합니다.
- API 키는 브라우저 storage나 장면 JSON에 저장하지 않습니다.
- 생성된 텍스트나 JavaScript는 실행하지 않습니다.
- 삭제와 범위 초과 명령은 Command Bus에서 차단됩니다.
