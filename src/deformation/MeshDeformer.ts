import type { Geometry } from "../geometry/Geometry.js";
import {
  DEFAULT_DEFORMATION_STATE,
  type DeformationAxis,
  type DeformationState,
} from "./DeformationTypes.js";

const AXIS_COMPONENTS: Readonly<Record<DeformationAxis, readonly [number, number, number]>> = {
  x: [0, 1, 2],
  y: [1, 0, 2],
  z: [2, 0, 1],
};

const EPSILON = 1e-8;

/**
 * Deterministically deforms one geometry from an immutable base-position snapshot.
 *
 * Each state change replaces the previous pose instead of accumulating edits. Position and normal
 * attributes, bounding volumes and the GPU revision are updated before the call returns.
 */
export class MeshDeformer {
  private basePositions: Float32Array;
  private readonly minimum = [0, 0, 0];
  private readonly maximum = [0, 0, 0];
  private values: DeformationState = { ...DEFAULT_DEFORMATION_STATE };

  constructor(public readonly geometry: Geometry) {
    const positions = geometry.getAttribute<Float32Array>("position");
    if (!positions || !(positions.array instanceof Float32Array) || positions.itemSize !== 3) {
      throw new TypeError(
        "Mesh deformation requires a three-component Float32 position attribute.",
      );
    }
    this.basePositions = positions.array.slice();
    this.measureBase();
  }

  get axis(): DeformationAxis {
    return this.values.axis;
  }

  set axis(value: DeformationAxis) {
    this.configure({ axis: value });
  }

  get stretch(): number {
    return this.values.stretch;
  }

  set stretch(value: number) {
    this.configure({ stretch: value });
  }

  get bend(): number {
    return this.values.bend;
  }

  set bend(value: number) {
    this.configure({ bend: value });
  }

  get twist(): number {
    return this.values.twist;
  }

  set twist(value: number) {
    this.configure({ twist: value });
  }

  get taper(): number {
    return this.values.taper;
  }

  set taper(value: number) {
    this.configure({ taper: value });
  }

  get waveAmplitude(): number {
    return this.values.waveAmplitude;
  }

  set waveAmplitude(value: number) {
    this.configure({ waveAmplitude: value });
  }

  get waveFrequency(): number {
    return this.values.waveFrequency;
  }

  set waveFrequency(value: number) {
    this.configure({ waveFrequency: value });
  }

  get wavePhase(): number {
    return this.values.wavePhase;
  }

  set wavePhase(value: number) {
    this.configure({ wavePhase: value });
  }

  /** Returns a detached snapshot suitable for diagnostics or command construction. */
  snapshot(): DeformationState {
    return { ...this.values };
  }

  /** Reports whether the current state changes the captured base shape. */
  isActive(): boolean {
    return (
      this.values.stretch !== 1 ||
      this.values.bend !== 0 ||
      this.values.twist !== 0 ||
      this.values.taper !== 0 ||
      this.values.waveAmplitude !== 0
    );
  }

  /** Validates and applies one or more state properties in a single geometry update. */
  configure(update: Partial<DeformationState>): this {
    const next = { ...this.values, ...update };
    this.validate(next);
    this.values = next;
    return this.apply();
  }

  /** Restores neutral parameters and the exact captured base positions. */
  reset(): this {
    this.values = { ...DEFAULT_DEFORMATION_STATE, axis: this.values.axis };
    return this.apply();
  }

  /** Uses the current geometry pose as a new immutable base and clears active modifiers. */
  captureBase(): this {
    const positions = this.positions();
    this.basePositions = positions.array.slice();
    this.values = { ...DEFAULT_DEFORMATION_STATE, axis: this.values.axis };
    this.measureBase();
    return this;
  }

  /** Evaluates the complete modifier stack and refreshes derived geometry state. */
  apply(): this {
    const positions = this.positions();
    if (positions.array.length !== this.basePositions.length) {
      throw new Error("Geometry topology changed after the deformation base was captured.");
    }
    if (!this.isActive()) {
      positions.array.set(this.basePositions);
      return this.refreshGeometry();
    }

    const [longitudinalIndex, firstIndex, secondIndex] = AXIS_COMPONENTS[this.values.axis];
    const center = [
      (this.minimum[0]! + this.maximum[0]!) * 0.5,
      (this.minimum[1]! + this.maximum[1]!) * 0.5,
      (this.minimum[2]! + this.maximum[2]!) * 0.5,
    ];
    const longitudinalLength = this.maximum[longitudinalIndex]! - this.minimum[longitudinalIndex]!;
    const effectiveLength = Math.max(longitudinalLength * this.values.stretch, EPSILON);

    for (let offset = 0; offset < this.basePositions.length; offset += 3) {
      const baseLongitudinal =
        (this.basePositions[offset + longitudinalIndex] ?? 0) - center[longitudinalIndex]!;
      const normalized = longitudinalLength > EPSILON ? baseLongitudinal / longitudinalLength : 0;
      let longitudinal = baseLongitudinal * this.values.stretch;
      let first = (this.basePositions[offset + firstIndex] ?? 0) - center[firstIndex]!;
      let second = (this.basePositions[offset + secondIndex] ?? 0) - center[secondIndex]!;

      if (Math.abs(this.values.bend) > EPSILON && longitudinalLength > EPSILON) {
        const angle = this.values.bend * normalized;
        const radius = effectiveLength / this.values.bend;
        const sine = Math.sin(angle);
        const cosine = Math.cos(angle);
        const curvedLongitudinal = radius * sine;
        const curvedFirst = radius * (1 - cosine);
        longitudinal = curvedLongitudinal - first * sine;
        first = curvedFirst + first * cosine;
      }

      if (Math.abs(this.values.twist) > EPSILON) {
        const angle = this.values.twist * normalized;
        const sine = Math.sin(angle);
        const cosine = Math.cos(angle);
        const rotatedFirst = first * cosine - second * sine;
        second = first * sine + second * cosine;
        first = rotatedFirst;
      }

      const taperScale = 1 + this.values.taper * normalized;
      first *= taperScale;
      second *= taperScale;

      if (Math.abs(this.values.waveAmplitude) > EPSILON) {
        first +=
          this.values.waveAmplitude *
          Math.sin(
            (normalized + 0.5) * this.values.waveFrequency * Math.PI * 2 + this.values.wavePhase,
          );
      }

      positions.array[offset + longitudinalIndex] = center[longitudinalIndex]! + longitudinal;
      positions.array[offset + firstIndex] = center[firstIndex]! + first;
      positions.array[offset + secondIndex] = center[secondIndex]! + second;
    }

    return this.refreshGeometry();
  }

  private positions() {
    const positions = this.geometry.getAttribute<Float32Array>("position");
    if (!positions || !(positions.array instanceof Float32Array) || positions.itemSize !== 3) {
      throw new TypeError(
        "Mesh deformation requires a three-component Float32 position attribute.",
      );
    }
    return positions;
  }

  private measureBase(): void {
    this.minimum.fill(Number.POSITIVE_INFINITY);
    this.maximum.fill(Number.NEGATIVE_INFINITY);
    for (let offset = 0; offset < this.basePositions.length; offset += 3) {
      for (let component = 0; component < 3; component += 1) {
        const value = this.basePositions[offset + component] ?? 0;
        this.minimum[component] = Math.min(this.minimum[component]!, value);
        this.maximum[component] = Math.max(this.maximum[component]!, value);
      }
    }
  }

  private refreshGeometry(): this {
    this.geometry.markUpdated(["position"]);
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    return this;
  }

  private validate(state: DeformationState): void {
    if (!(["x", "y", "z"] as const).includes(state.axis)) {
      throw new RangeError("Deformation axis must be 'x', 'y' or 'z'.");
    }
    for (const [name, value] of Object.entries(state)) {
      if (name !== "axis" && (typeof value !== "number" || !Number.isFinite(value))) {
        throw new TypeError(`Deformation '${name}' must be finite.`);
      }
    }
    if (state.stretch < 0.05 || state.stretch > 20) {
      throw new RangeError("Deformation stretch must be in the 0.05..20 range.");
    }
    if (Math.abs(state.bend) > Math.PI * 4) {
      throw new RangeError("Deformation bend cannot exceed four full turns.");
    }
    if (Math.abs(state.twist) > Math.PI * 8) {
      throw new RangeError("Deformation twist cannot exceed eight full turns.");
    }
    if (Math.abs(state.taper) >= 1.95) {
      throw new RangeError("Deformation taper magnitude must be below 1.95.");
    }
    if (Math.abs(state.waveAmplitude) > 10_000) {
      throw new RangeError("Deformation wave amplitude cannot exceed 10,000 units.");
    }
    if (state.waveFrequency < 0 || state.waveFrequency > 128) {
      throw new RangeError("Deformation wave frequency must be in the 0..128 range.");
    }
    if (Math.abs(state.wavePhase) > Math.PI * 1_000) {
      throw new RangeError("Deformation wave phase exceeds the supported range.");
    }
  }
}
