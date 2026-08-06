export {
  BUILTIN_MODEL_TEMPLATES,
  createBuiltinModelFactory,
  createProceduralCar,
  createProceduralFace,
  createProceduralPerson,
  createProceduralTree,
  type ProceduralCarOptions,
  type ProceduralFaceOptions,
  type ProceduralPersonOptions,
  type ProceduralTreeOptions,
} from "./BuiltinModels.js";
export {
  ModelFactory,
  type ModelCreateOptions,
  type ModelTemplate,
  type ModelTemplateInfo,
} from "./ModelFactory.js";
export {
  ProceduralModel,
  createPrimitiveModel,
  type ModelColor,
  type ModelColor as ProceduralColor,
  type ModelPartDefinition,
  type ModelPrimitive,
} from "./ProceduralModel.js";
