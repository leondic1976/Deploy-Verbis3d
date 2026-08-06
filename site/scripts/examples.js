import animationSource from "../../examples/animation/index.ts?raw";
import assetCacheSource from "../../examples/asset-cache/index.ts?raw";
import basicCubeSource from "../../examples/basic-cube/index.ts?raw";
import cameraFrustumSource from "../../examples/camera-frustum/index.ts?raw";
import commandSafetySource from "../../examples/command-safety/index.ts?raw";
import customProviderSource from "../../examples/custom-ai-provider/index.ts?raw";
import engineLoopSource from "../../examples/engine-loop/index.ts?raw";
import geometryGallerySource from "../../examples/geometry-gallery/index.ts?raw";
import materialStatesSource from "../../examples/material-states/index.ts?raw";
import mathTransformSource from "../../examples/math-transform-pipeline/index.ts?raw";
import modelFactorySource from "../../examples/model-factory/index.ts?raw";
import naturalLanguageSource from "../../examples/natural-language/index.ts?raw";
import naturalSceneSource from "../../examples/natural-language-scene/index.ts?raw";
import pluginLifecycleSource from "../../examples/plugin-lifecycle/index.ts?raw";
import proceduralCarSource from "../../examples/procedural-car/index.ts?raw";
import proceduralFaceSource from "../../examples/procedural-face/index.ts?raw";
import proceduralPersonSource from "../../examples/procedural-person/index.ts?raw";
import sceneGraphSource from "../../examples/scene-graph/index.ts?raw";
import serializationSource from "../../examples/serialization-roundtrip/index.ts?raw";
import structuredCommandsSource from "../../examples/structured-commands/index.ts?raw";

const repositoryBase = "https://github.com/leondic1976/Deploy-Verbis3d/tree/main/examples";

const examples = [
  {
    id: "math-transform-pipeline",
    title: "Math transform pipeline",
    level: "beginner",
    topic: "core",
    description: "Compose, invert and apply a column-major world transform.",
    learning: "Vector3, Quaternion, Matrix4 composition and reversible coordinate transforms.",
    source: mathTransformSource,
  },
  {
    id: "scene-graph",
    title: "Scene graph hierarchy",
    level: "beginner",
    topic: "core",
    description: "Build parent-child transforms and inspect derived world positions.",
    learning: "Object3D parenting, local versus world space, traversal and matrix updates.",
    source: sceneGraphSource,
  },
  {
    id: "basic-cube",
    title: "First rendered cube",
    level: "beginner",
    topic: "rendering",
    description: "Connect camera, geometry, material, renderer and frame loop.",
    learning: "The shortest complete WebGL2 rendering path through the public API.",
    source: basicCubeSource,
    playground: "./playground.html?level=beginner",
  },
  {
    id: "geometry-gallery",
    title: "Geometry gallery",
    level: "builder",
    topic: "rendering",
    description: "Create indexed box, sphere and plane geometry with bounds.",
    learning: "Primitive constructors, vertex/index counts and computed bounding volumes.",
    source: geometryGallerySource,
    playground: "./playground.html?level=builder",
  },
  {
    id: "material-states",
    title: "Material and render state",
    level: "builder",
    topic: "rendering",
    description: "Control color, alpha, depth writes and face culling.",
    learning: "BasicMaterial uniforms and the fixed-function state applied per draw.",
    source: materialStatesSource,
    playground: "./playground.html?level=builder",
  },
  {
    id: "camera-frustum",
    title: "Camera frustum checks",
    level: "builder",
    topic: "core",
    description: "Update a camera and test bounding spheres against six planes.",
    learning: "View-projection matrices, camera orientation and CPU-side visibility tests.",
    source: cameraFrustumSource,
  },
  {
    id: "engine-loop",
    title: "Engine frame phases",
    level: "builder",
    topic: "core",
    description: "Separate fixed simulation, variable updates and render callbacks.",
    learning: "Engine lifecycle, fixed timestep work and duplicate-safe animation scheduling.",
    source: engineLoopSource,
  },
  {
    id: "procedural-car",
    title: "Editable procedural car",
    level: "builder",
    topic: "rendering",
    description: "Assemble a car from 22 selectable engine-native parts.",
    learning: "Compound Object3D transforms, part lookup, recoloring and wheel updates.",
    source: proceduralCarSource,
    playground: "./playground.html?level=builder&preset=car-workshop",
  },
  {
    id: "model-factory",
    title: "Extensible model factory",
    level: "builder",
    topic: "rendering",
    description: "Register a custom robot beside the built-in car, person, face and tree.",
    learning: "Application-owned template catalogs, data-only parts and custom color slots.",
    source: modelFactorySource,
    playground: "./playground.html?level=builder&preset=model-gallery",
  },
  {
    id: "structured-commands",
    title: "Structured commands",
    level: "builder",
    topic: "commands",
    description: "Dry-run and execute the same validated EngineCommand object.",
    learning: "CommandBus validation, deterministic execution and auditable history.",
    source: structuredCommandsSource,
    playground: "./playground.html?level=expert",
  },
  {
    id: "animation",
    title: "Keyframe animation",
    level: "advanced",
    topic: "animation",
    description: "Combine vector interpolation and quaternion slerp in one clip.",
    learning: "AnimationClip, typed tracks, mixer playback, pause and timeline seeking.",
    source: animationSource,
    playground: "./playground.html?level=advanced",
  },
  {
    id: "serialization-roundtrip",
    title: "Scene JSON round-trip",
    level: "advanced",
    topic: "platform",
    description: "Serialize a scene as data and reconstruct safe engine objects.",
    learning: "Versioned scene JSON, transforms, materials, user data and validation.",
    source: serializationSource,
    playground: "./playground.html?level=expert",
  },
  {
    id: "asset-cache",
    title: "Deduplicated asset loading",
    level: "advanced",
    topic: "platform",
    description: "Share concurrent requests and clear failed loads from a cache.",
    learning: "Asset, Loader and AssetManager boundaries without a hidden global cache.",
    source: assetCacheSource,
  },
  {
    id: "plugin-lifecycle",
    title: "Plugin lifecycle",
    level: "advanced",
    topic: "platform",
    description: "Install a diagnostic extension and release its callback cleanly.",
    learning: "VerbisPlugin install/uninstall contracts and listener cleanup.",
    source: pluginLifecycleSource,
  },
  {
    id: "procedural-face",
    title: "Editable procedural face",
    level: "advanced",
    topic: "rendering",
    description: "Build a stylized face bust from 18 independently editable parts.",
    learning: "Hierarchical modeling, expression edits and root-level transformation.",
    source: proceduralFaceSource,
    playground: "./playground.html?level=advanced&preset=face-study",
  },
  {
    id: "procedural-person",
    title: "Editable full-body person",
    level: "advanced",
    topic: "animation",
    description: "Create, pose and recolor a person assembled from 21 selectable parts.",
    learning: "Stable part IDs, semantic color roles and part-level procedural motion.",
    source: proceduralPersonSource,
    playground: "./playground.html?level=advanced&preset=model-gallery",
  },
  {
    id: "natural-language",
    title: "Natural-language object creation",
    level: "expert",
    topic: "commands",
    description: "Turn one Korean sentence into four safe scene operations.",
    learning: "Provider adapters, create/move/animate/color commands and result checks.",
    source: naturalLanguageSource,
    playground:
      "./playground.html?level=beginner&command=%EB%B9%A8%EA%B0%84%20%EA%B5%AC%EB%A5%BC%20%EB%A7%8C%EB%93%A4%EC%96%B4%20%EC%98%A4%EB%A5%B8%EC%AA%BD%EC%9C%BC%EB%A1%9C%202%20%EC%9D%B4%EB%8F%99%ED%95%98%EA%B3%A0%20%EC%B2%9C%EC%B2%9C%ED%9E%88%20%ED%9A%8C%EC%A0%84%EC%8B%9C%EC%BC%9C",
  },
  {
    id: "natural-language-scene",
    title: "Natural-language scene recipe",
    level: "expert",
    topic: "commands",
    description: "Build a multi-object composition from a sequence of human instructions.",
    learning: "Multi-create naming, sequential context and persistent animation metadata.",
    source: naturalSceneSource,
    playground:
      "./playground.html?level=advanced&command=%ED%8C%8C%EB%9E%80%20%ED%81%90%EB%B8%8C%203%EA%B0%9C%EB%A5%BC%20%EB%A7%8C%EB%93%A4%EC%96%B4",
  },
  {
    id: "command-safety",
    title: "Untrusted command safety",
    level: "expert",
    topic: "commands",
    description: "Reject an excessive provider result before scene mutation.",
    learning: "Runtime schema checks, configured ranges and explicit error codes.",
    source: commandSafetySource,
    playground: "./playground.html?level=expert",
  },
  {
    id: "custom-ai-provider",
    title: "Custom AI provider adapter",
    level: "expert",
    topic: "commands",
    description: "Map a domain verb to a structured command without generated code.",
    learning: "Implementing AIProvider while preserving the validation and command boundary.",
    source: customProviderSource,
  },
];

const state = {
  level: "all",
  topic: "all",
  query: "",
  selected: examples[0],
};

const topicLabels = {
  core: "Core",
  rendering: "Rendering",
  animation: "Animation",
  commands: "Commands & AI",
  platform: "Assets & plugins",
};

const byId = (id) => {
  const element = document.querySelector(`#${id}`);
  if (!element) throw new Error(`Example control '#${id}' is missing.`);
  return element;
};

const visibleExamples = () =>
  examples.filter((example) => {
    const levelMatches = state.level === "all" || example.level === state.level;
    const topicMatches = state.topic === "all" || example.topic === state.topic;
    const searchable =
      `${example.title} ${example.description} ${example.learning} ${example.topic}`.toLowerCase();
    return levelMatches && topicMatches && searchable.includes(state.query);
  });

const selectExample = (example) => {
  state.selected = example;
  byId("source-level").textContent = example.level;
  byId("source-topic").textContent = topicLabels[example.topic];
  byId("source-title").textContent = example.title;
  byId("source-description").textContent = example.description;
  byId("source-learning").textContent = example.learning;
  byId("source-code").textContent = example.source.trim();
  byId("open-source").href = `${repositoryBase}/${example.id}`;
  const playground = byId("source-playground");
  playground.hidden = !example.playground;
  playground.href = example.playground ?? "./playground.html";
  byId("copy-status").textContent =
    `${example.source.trim().split(/\r?\n/).length} lines · typechecked in CI`;
  renderList();
};

const renderList = () => {
  const list = byId("example-list");
  const filtered = visibleExamples();
  list.replaceChildren();
  for (const example of filtered) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.exampleId = example.id;
    button.setAttribute("aria-pressed", String(state.selected?.id === example.id));
    const meta = document.createElement("span");
    meta.className = "example-item-meta";
    const level = document.createElement("span");
    level.textContent = example.level;
    const topic = document.createElement("span");
    topic.textContent = topicLabels[example.topic];
    meta.append(level, topic);
    const title = document.createElement("strong");
    title.textContent = example.title;
    const description = document.createElement("small");
    description.textContent = example.description;
    button.append(meta, title, description);
    button.addEventListener("click", () => selectExample(example));
    item.append(button);
    list.append(item);
  }
  byId("examples-empty").hidden = filtered.length > 0;
  byId("example-count").textContent = `${filtered.length} of ${examples.length} examples`;
};

const setLevel = (level) => {
  state.level = level;
  for (const button of document.querySelectorAll("[data-example-level]")) {
    button.setAttribute("aria-pressed", String(button.dataset.exampleLevel === level));
  }
  const filtered = visibleExamples();
  if (filtered.length > 0 && !filtered.includes(state.selected)) state.selected = filtered[0];
  if (state.selected) selectExample(state.selected);
  else renderList();
};

for (const button of document.querySelectorAll("[data-example-level]")) {
  button.addEventListener("click", () => setLevel(button.dataset.exampleLevel));
}

for (const link of document.querySelectorAll("[data-path-filter]")) {
  link.addEventListener("click", () => setLevel(link.dataset.pathFilter));
}

byId("example-topic").addEventListener("change", () => {
  state.topic = byId("example-topic").value;
  const filtered = visibleExamples();
  if (filtered.length > 0 && !filtered.includes(state.selected)) state.selected = filtered[0];
  if (state.selected) selectExample(state.selected);
  else renderList();
});

byId("example-search").addEventListener("input", () => {
  state.query = byId("example-search").value.trim().toLowerCase();
  const filtered = visibleExamples();
  if (filtered.length > 0 && !filtered.includes(state.selected)) state.selected = filtered[0];
  if (state.selected) selectExample(state.selected);
  else renderList();
});

byId("copy-source").addEventListener("click", async () => {
  if (!state.selected) return;
  try {
    await navigator.clipboard.writeText(state.selected.source.trim());
    byId("copy-status").textContent = `${state.selected.title} source copied.`;
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(byId("source-code"));
    selection?.removeAllRanges();
    selection?.addRange(range);
    byId("copy-status").textContent =
      "Clipboard permission was unavailable. The source text has been selected.";
  }
});

selectExample(examples[0]);
