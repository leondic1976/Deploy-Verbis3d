import { Matrix4, Quaternion, Vector3 } from "../../src/index.js";

const position = new Vector3(2, 1, -3);
const rotation = new Quaternion().setFromAxisAngle(Vector3.UP, Math.PI / 4);
const scale = new Vector3(2, 2, 2);

// Compose a column-major world transform, then safely invert it.
const worldMatrix = new Matrix4().compose(position, rotation, scale);
const localPoint = new Vector3(0.5, 0, 0);
const worldPoint = worldMatrix.transformPoint(localPoint);
const recoveredPoint = worldMatrix.clone().invert().transformPoint(worldPoint);

console.log({ worldPoint, recoveredPoint });
