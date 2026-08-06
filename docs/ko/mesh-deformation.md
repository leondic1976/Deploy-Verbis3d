# 객체 이동과 메시 모양 변형

Verbis3D에서는 객체의 이동과 모양 변경을 구분합니다.

- `position`, `rotation`, `scale`은 객체 전체의 좌표계를 변경합니다.
- `mesh.deformation`은 객체의 로컬 정점을 변경하여 실제 실루엣을 바꿉니다.

```ts
const sculpture = new Mesh(
  new SphereGeometry(1, 32, 18),
  new BasicMaterial({ color: [0.15, 0.78, 0.66, 1] }),
);

sculpture.position.set(2, 0, -3);
sculpture.deformation.configure({
  axis: "y",
  stretch: 1.8,
  bend: Math.PI * 0.45,
  twist: Math.PI,
  taper: 0.55,
  waveAmplitude: 0.08,
  waveFrequency: 2,
});
```

변형은 이전 결과를 다시 변형하지 않고 최초 기준 정점에서 매번 계산합니다. 따라서
슬라이더나 애니메이션을 반복해도 오차가 누적되지 않습니다. 계산 후에는 법선, 바운딩 박스,
바운딩 스피어와 WebGL2 버퍼 버전을 함께 갱신합니다.

## 명령과 자연어

허용 목록에 등록된 구조화 명령만 실행합니다.

```json
{
  "version": "1.0",
  "command": "deformObject",
  "target": { "name": "cube" },
  "parameters": {
    "axis": "y",
    "bend": 90,
    "twist": 120,
    "unit": "degrees"
  }
}
```

오프라인 규칙 Provider에서는 `큐브를 90도 휘어 비틀어`, `큐브의 원래 모양으로 초기화` 같은
문장을 검증된 `deformObject`, `resetDeformation` 명령으로 변환합니다.

## 모양 애니메이션

`NumberKeyframeTrack("deformation.twist", ...)`처럼 일반 애니메이션 속성 경로를 그대로
사용합니다. 한 클립에서 `position.x`와 `deformation.twist`를 함께 재생할 수도 있습니다.

Playground에서 Builder 이상을 선택하고 객체 Inspector의 **Shape deformation**을 사용하거나,
**Bend · twist · reshape lab** 프리셋을 불러오면 직접 확인할 수 있습니다.

현재 구현은 중간 크기 메시를 위한 CPU 변형입니다. 대규모 스키닝, 소프트바디 물리, GPU 및
WebGPU compute 변형은 후속 범위입니다.
