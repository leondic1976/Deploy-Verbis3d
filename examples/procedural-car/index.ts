import { BasicMaterial, Mesh, Scene, createProceduralCar, type Object3D } from "../../src/index.js";

// A compound model is an ordinary Object3D hierarchy. The factory builds each
// body panel, window, light, wheel and hub with Verbis3D geometry and materials.
const scene = new Scene();
const car = createProceduralCar({
  name: "study-car",
  bodyColor: [0.08, 0.56, 0.92, 1],
});
scene.add(car);

// Transform the root to move, turn or resize the complete car.
car.position.set(-1.5, 0, 0);
car.rotateY(Math.PI / 6);
car.scale.set(1.2, 1.2, 1.2);

// Child parts stay addressable for detailed editing.
const hood = car.getObjectByName("study-car-hood");
if (hood instanceof Mesh && hood.material instanceof BasicMaterial) {
  hood.material.color.set(1, 0.28, 0.08, 1);
}

const frontWheels = [
  car.getObjectByName("study-car-front-left-wheel"),
  car.getObjectByName("study-car-front-right-wheel"),
].filter((part): part is Object3D => part !== undefined);

// A frame loop can update these parts while the root follows a driving path.
export function updateCar(deltaTime: number): void {
  car.translateX(deltaTime * 0.8);
  for (const wheel of frontWheels) wheel.rotateZ(-deltaTime * 3);
}

export { car, scene };
