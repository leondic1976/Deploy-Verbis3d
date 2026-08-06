# 장면, 객체, 변형과 복합 모델

## 장면 그래프의 기본

`Object3D`는 렌더링 여부와 관계없이 위치·회전·크기와 자식 목록을 갖습니다. `Mesh`는
`Object3D`를 확장하고 `Geometry`와 `Material`을 추가합니다.

```ts
const group = new Object3D();
group.name = "robot";

const body = new Mesh(new BoxGeometry(), new BasicMaterial());
body.name = "robot-body";
const head = new Mesh(new SphereGeometry(), new BasicMaterial());
head.name = "robot-head";
head.position.y = 1.2;

group.add(body, head);
scene.add(group);
```

`group`을 움직이면 body와 head가 함께 움직입니다. `head`를 움직이면 머리만 로컬
좌표에서 변경됩니다. 자기 자신이나 조상을 자식으로 추가하면 순환 참조 오류가 발생합니다.

## 위치, 회전, 크기

```ts
object.position.set(2, 1, -3); // 월드 부모 기준 위치
object.rotation.set(0, Math.PI / 4, 0); // 라디안 Euler 회전
object.scale.set(1, 2, 1); // Y축으로 두 배 늘리기

object.translateX(1); // 객체의 로컬 X축으로 이동
object.rotateY(Math.PI / 6); // 현재 회전에 30도 추가
object.lookAt({ x: 0, y: 0, z: 0 });
```

Inspector처럼 각도를 도 단위로 입력받는 UI에서는 `degrees * Math.PI / 180`으로
변환합니다. 크기 0은 역행렬과 선택 계산을 불안정하게 만들 수 있으므로 양수를 사용합니다.

## 기본 입체

```ts
new BoxGeometry(width, height, depth);
new SphereGeometry(radius, widthSegments, heightSegments);
new PlaneGeometry(width, height);
```

각 지오메트리는 position, normal, uv, index와 bounding box/sphere를 제공합니다.
`BasicMaterial`은 조명 없이 일정한 RGBA 색을 출력합니다.

## 자동차 만들기

```ts
import { createProceduralCar } from "@verbis3d/core";

const car = createProceduralCar({
  name: "delivery-car",
  bodyColor: [0.08, 0.56, 0.92, 1],
});
car.position.set(-2, -1.35, 0);
car.rotateY(Math.PI / 8);
scene.add(car);
```

반환값은 22개 부품을 가진 `Object3D`입니다. 루트 car를 선택하면 전체를 이동·회전·확대할
수 있고, 다음처럼 특정 부품만 변경할 수도 있습니다.

```ts
const hood = car.getObjectByName("delivery-car-hood");
if (hood instanceof Mesh && hood.material instanceof BasicMaterial) {
  hood.material.color.set(1, 0.25, 0.08, 1);
}
```

부품 이름은 `{루트 이름}-{부품 역할}` 규칙입니다. 창문, 바퀴, 허브, 조명도 같은 방식으로
조회할 수 있습니다.

## 얼굴 만들기

```ts
import { createProceduralFace } from "@verbis3d/core";

const face = createProceduralFace({
  name: "portrait",
  skinColor: [0.82, 0.52, 0.36, 1],
  hairColor: [0.04, 0.03, 0.025, 1],
});
face.position.y = -1.35;
scene.add(face);

face.getPart("mouth")?.scale.set(0.7, 0.14, 0.08);
face.getPart("left-eyebrow")?.rotateZ(-0.15);
```

얼굴은 18개 부품으로 구성됩니다. 사진 수준 메시가 아니라, 계층·부품 선택·표정 변형을
학습하는 스타일화된 절차적 예제입니다.

## 전신 사람과 모델 라이브러리

```ts
import { createBuiltinModelFactory, createProceduralPerson } from "@verbis3d/core";

const person = createProceduralPerson({
  name: "guide",
  skinColor: [0.72, 0.46, 0.31, 1],
  shirtColor: [0.12, 0.58, 0.82, 1],
});
scene.add(person);

person.getPart("left-upper-arm")?.rotateZ(-0.4);
person.setRoleColor("primary", [0.9, 0.22, 0.14, 1]);

const models = createBuiltinModelFactory();
scene.add(models.create("tree", { name: "street-tree" }));
```

전신 사람은 21개 파트이며 자동차 22개, 얼굴 18개, 나무 7개 템플릿과 같은
`ProceduralModel` API를 사용합니다. `getPart()`는 루트 이름에 의존하지 않는 파트 ID를
사용합니다. 사용자 정의 템플릿은 `ModelFactory.register()`와 `createPrimitiveModel()`로
등록할 수 있습니다.

## 임의 모양 만들기

정점 데이터를 직접 제공하면 내장 도형에 제한되지 않습니다.

```ts
const geometry = new Geometry()
  .setAttribute(
    "position",
    new BufferAttribute(new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]), 3),
  )
  .setIndex([0, 1, 2]);

geometry.computeBoundingBox();
geometry.computeBoundingSphere();
const triangle = new Mesh(geometry, new BasicMaterial({ color: [1, 0.5, 0.1, 1] }));
```

현재 기본 셰이더는 `aPosition`만 필수로 사용합니다. 사용자 셰이더나 조명 재질을 만들 때는
normal, uv 등의 attribute 계약을 재질과 맞춰야 합니다.

## 이름과 선택 규칙

- 자연어 대상 이름은 장면에서 고유하게 유지합니다.
- 같은 이름이 둘 이상이면 명령은 `AMBIGUOUS_TARGET`으로 중단됩니다.
- 복합 모델 전체 작업은 루트 이름을 사용합니다.
- 부품 작업은 완전한 부품 이름을 사용합니다.
- `traverse()`는 숨겨진 객체도 방문하고, `traverseVisible()`은 보이는 활성 객체만
  방문합니다.

## 저장과 복원

```ts
const loader = new JSONSceneLoader();
const json = loader.stringify(scene);
const restoredScene = loader.parse(JSON.parse(json));
```

자동차와 얼굴은 일반 장면 계층이므로 자식 구조, transform, 색상, `userData`가 함께
복원됩니다. JSON은 데이터로만 파싱되며 스크립트를 실행하지 않습니다.
