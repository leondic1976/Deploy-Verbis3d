import { PerspectiveCamera, Sphere, Vector3 } from "../../src/index.js";

const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 100);
camera.position.set(0, 2, 6);
camera.lookAt(new Vector3(0, 0, 0));
camera.updateCameraMatrices();

const candidates = [new Sphere(new Vector3(0, 0, 0), 1), new Sphere(new Vector3(20, 0, 0), 1)];
const visible = candidates.filter((sphere) => camera.frustum.intersectsSphere(sphere));

console.log(`${visible.length} of ${candidates.length} bounds are visible.`);
