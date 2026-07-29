import { describe, expect, it, vi } from "vitest";
import {
  Clock,
  Component,
  Entity,
  EventDispatcher,
  Object3D,
  Scene,
  Transform,
  Vector3,
  createUUID,
} from "../../src/index.js";

describe("engine core", () => {
  it("maintains cycle-free scene graphs and transforms", () => {
    const root = new Scene();
    const parent = new Object3D();
    const child = new Object3D();
    parent.name = "parent";
    child.name = "child";
    root.add(parent);
    parent.add(child);
    parent.position.set(2, 0, 0);
    child.position.set(1, 0, 0);
    root.updateWorldMatrix();
    expect(child.worldMatrix.elements[12]).toBe(3);
    expect(root.getObjectByName("child")).toBe(child);
    expect(root.getObjectById(child.id)).toBe(child);
    expect(() => child.add(root)).toThrow(/cycles/);
    parent.remove(child);
    expect(child.parent).toBeNull();
  });

  it("tracks transform dirtiness and skips clean local work", () => {
    const transform = new Transform();
    expect(transform.updateLocalMatrix()).toBe(true);
    expect(transform.updateLocalMatrix()).toBe(false);
    transform.position.x = 2;
    transform.position.set(2, 0, 0);
    expect(transform.localDirty).toBe(true);
  });

  it("traverses visibility and performs local transforms", () => {
    const root = new Object3D();
    const hidden = new Object3D();
    root.add(hidden);
    hidden.visible = false;
    const visitor = vi.fn();
    root.traverseVisible(visitor);
    expect(visitor).toHaveBeenCalledTimes(1);
    root.rotateY(Math.PI / 2).translateZ(1);
    expect(root.position.x).toBeCloseTo(1);
    expect(root.rotation.y).toBeCloseTo(Math.PI / 2);
    root.rotation.set(0, Math.PI / 4, 0);
    expect(root.quaternion.y).toBeCloseTo(Math.sin(Math.PI / 8));
    root.lookAt(new Vector3(0, 0, -1));
  });

  it("dispatches events and manages components", () => {
    const dispatcher = new EventDispatcher();
    const listener = vi.fn();
    dispatcher.addEventListener("test", listener).dispatchEvent({ type: "test" });
    expect(listener).toHaveBeenCalledOnce();
    dispatcher.removeEventListener("test", listener).dispatchEvent({ type: "test" });
    expect(listener).toHaveBeenCalledOnce();

    class Counter extends Component {
      updates = 0;
      override update(): void {
        this.updates += 1;
      }
    }
    const entity = new Entity();
    const counter = new Counter();
    entity.addComponent(counter);
    counter.update();
    expect(counter.entity).toBe(entity);
    expect(counter.updates).toBe(1);
    entity.removeComponent(counter);
    expect(counter.entity).toBeNull();
  });

  it("clamps clocks and creates UUIDs", () => {
    const clock = new Clock(0.05);
    clock.start(0);
    expect(clock.tick(1000)).toBe(0.05);
    expect(clock.elapsedTime).toBe(0.05);
    expect(createUUID()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
