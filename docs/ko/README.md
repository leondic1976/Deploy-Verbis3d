# Verbis3D 한국어 문서

Verbis3D는 TypeScript와 WebGL2로 직접 구현한 실험 단계의 웹 3D 엔진입니다. Three.js,
Babylon.js 같은 완성형 엔진을 내부에서 사용하지 않습니다. 현재 버전은
`0.3.0-alpha.1`이며, 안정 버전 전까지 공개 API가 변경될 수 있습니다.

## 무엇부터 읽어야 하나요?

처음 사용하는 경우 다음 순서를 권장합니다.

1. [처음부터 회전하는 큐브까지](getting-started.md)
2. [장면, 객체, 변형과 복합 모델](scene-and-modeling.md)
3. [Playground 실습 안내](playground.md)
4. [여러 사진으로 3D 만들기](../photo-reconstruction.md)
5. [자연어 명령과 AI Provider 설정](natural-language.md)
6. 자동 생성된 [API 문서](../../site/api/index.html)

## 현재 가능한 작업

- 벡터·쿼터니언·행렬을 이용한 좌표 계산
- 부모·자식 장면 그래프와 dirty transform 갱신
- 원근·직교 카메라
- 상자·평면·구와 임의 정점/인덱스 `Geometry`
- 단색 `BasicMaterial`과 WebGL2 렌더링
- 프레임 루프와 기초 키프레임 애니메이션
- 객체 생성·선택·이동·회전·크기·색상·표시·복제·그룹 명령
- 한국어/영어 오프라인 자연어 규칙
- Ollama 및 OpenAI 호환 명령 Provider
- 오프라인·Ollama·호환 Vision Provider와 여러 사진 기반 visual-hull 메시
- 자동차와 얼굴을 포함한 편집 가능한 절차적 복합 모델
- JSON 장면 저장·복원과 플러그인 생명주기

## 아직 제공하지 않는 작업

glTF, 스키닝, 고밀도 얼굴 메시, PBR, 광원·그림자, 물리, 제작용 텍스처 파이프라인,
WebGPU는 아직 구현되지 않았습니다. Playground의 자동차와 얼굴은 엔진의 계층 모델링을
학습하기 위한 절차적 모델이며, 사진 수준 또는 CAD 수준 에셋이 아닙니다.

## 자주 쓰는 용어

| 용어        | 의미                                                     |
| ----------- | -------------------------------------------------------- |
| `Scene`     | 렌더링할 객체를 담는 최상위 장면                         |
| `Object3D`  | 위치·회전·크기와 자식 객체를 갖는 장면 노드              |
| `Mesh`      | `Geometry`와 `Material`을 결합한 렌더링 객체             |
| 로컬 좌표   | 부모 객체를 기준으로 한 좌표                             |
| 월드 좌표   | 장면 전체를 기준으로 한 최종 좌표                        |
| 루트 객체   | 복합 모델 전체를 대표하는 최상위 노드                    |
| Provider    | 자연어를 허용된 `EngineCommand[]` 데이터로 바꾸는 어댑터 |
| Command Bus | 명령을 검증하고 공개 엔진 API로 실행하는 경계            |
