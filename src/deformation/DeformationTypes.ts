/** Local geometry axis used to evaluate longitudinal deformation. */
export type DeformationAxis = "x" | "y" | "z";

/** Complete deterministic shape state evaluated by {@link MeshDeformer}. */
export interface DeformationState {
  axis: DeformationAxis;
  stretch: number;
  bend: number;
  twist: number;
  taper: number;
  waveAmplitude: number;
  waveFrequency: number;
  wavePhase: number;
}

/** Neutral deformation values that reproduce the captured base geometry. */
export const DEFAULT_DEFORMATION_STATE: Readonly<DeformationState> = Object.freeze({
  axis: "y",
  stretch: 1,
  bend: 0,
  twist: 0,
  taper: 0,
  waveAmplitude: 0,
  waveFrequency: 1,
  wavePhase: 0,
});
