import {
  BasicMaterial,
  BoxGeometry,
  CommandBus,
  Engine,
  JSONSceneLoader,
  Matrix4,
  Mesh,
  Object3D,
  OllamaProvider,
  OpenAICompatibleProvider,
  PerspectiveCamera,
  PlaneGeometry,
  Ray,
  RuleBasedProvider,
  Scene,
  SphereGeometry,
  Vector3,
  WebGL2Renderer,
} from "../../src/index.ts";

const LEVELS = ["beginner", "builder", "advanced", "expert"];
const LEVEL_CONTENT = {
  beginner: {
    title: "Start with direct edits",
    description:
      "Select an object, change one value, then describe the same change in natural language.",
  },
  builder: {
    title: "Build a real scene",
    description:
      "Add, duplicate, rename and parent objects while controlling geometry and material state.",
  },
  advanced: {
    title: "Direct motion and cameras",
    description:
      "Attach procedural motion, scrub a timeline, tune the environment and load larger presets.",
  },
  expert: {
    title: "Inspect the command pipeline",
    description:
      "Validate EngineCommand JSON, round-trip complete scenes and monitor runtime diagnostics.",
  },
};

const COMMAND_TEMPLATES = {
  move: (target) => ({
    version: "1.0",
    command: "moveObject",
    target: { name: target },
    parameters: { x: 1, y: 0, z: 0, space: "world" },
  }),
  rotate: (target) => ({
    version: "1.0",
    command: "rotateObject",
    target: { name: target },
    parameters: { x: 0, y: 45, z: 0, unit: "degrees" },
  }),
  create: () => ({
    version: "1.0",
    command: "createObject",
    parameters: { shape: "sphere", name: "command-sphere" },
  }),
  color: (target) => ({
    version: "1.0",
    command: "setColor",
    target: { name: target },
    parameters: { color: [1, 0.32, 0.18, 1] },
  }),
  duplicate: (target) => ({
    version: "1.0",
    command: "duplicateObject",
    target: { name: target },
    parameters: { name: `${target}-copy` },
  }),
};

const byId = (id) => {
  const element = document.querySelector(`#${id}`);
  if (!element) throw new Error(`Playground control '#${id}' is missing.`);
  return element;
};

const canvas = byId("playground-canvas");
const workspace = byId("main");
const commandResult = byId("command-result");
const commandForm = byId("command-form");
const naturalCommand = byId("natural-command");
const naturalPreview = byId("natural-command-preview");
const sceneTree = byId("scene-tree");
const inputs = {
  px: byId("position-x"),
  py: byId("position-y"),
  pz: byId("position-z"),
  rx: byId("rotation-x"),
  ry: byId("rotation-y"),
  rz: byId("rotation-z"),
  sx: byId("scale-x"),
  sy: byId("scale-y"),
  sz: byId("scale-z"),
};

const state = {
  selected: null,
  level: "beginner",
  undo: [],
  redo: [],
  activity: [],
  guideSteps: new Set(),
  motionPlaying: true,
  playhead: 0,
  cameraOrbit: false,
  cameraControls: {
    target: new Vector3(),
    distance: 10,
    yaw: 0,
    pitch: 0,
  },
  pointerGesture: {
    pointers: new Map(),
    primaryId: null,
    startX: 0,
    startY: 0,
    previousX: 0,
    previousY: 0,
    moved: false,
    pan: false,
    pinchDistance: 0,
    pinchCameraDistance: 0,
  },
  providerMode: "rule",
  providerSettings: {
    ollama: {
      endpoint: "http://127.0.0.1:11434",
      model: "qwen3:8b",
      apiKey: "",
    },
    compatible: {
      endpoint: "",
      model: "",
      apiKey: "",
    },
  },
  editSnapshot: null,
  lastStatsUpdate: 0,
  framesSinceStats: 0,
};

const readNumber = (input, fallback) => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
};

const colorToHex = (color) =>
  `#${[color.r, color.g, color.b]
    .map((value) =>
      Math.round(Math.min(1, Math.max(0, value)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const hexToColor = (hex, alpha = 1) => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
  alpha,
];

const geometryName = (geometry) => {
  if (geometry instanceof BoxGeometry) return "BoxGeometry";
  if (geometry instanceof SphereGeometry) return "SphereGeometry";
  if (geometry instanceof PlaneGeometry) return "PlaneGeometry";
  return geometry?.constructor?.name ?? "—";
};

const makeMesh = (shape, name, color, size = 1) => {
  const geometry =
    shape === "sphere"
      ? new SphereGeometry(size * 0.5)
      : shape === "plane"
        ? new PlaneGeometry(size, size)
        : new BoxGeometry(size, size, size);
  const mesh = new Mesh(geometry, new BasicMaterial({ color }));
  mesh.name = name;
  return mesh;
};

const scene = new Scene();
const camera = new PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(5.5, 4, 7.5);
camera.lookAt({ x: 0, y: 0, z: 0 });
let renderer = null;
try {
  renderer = new WebGL2Renderer({ canvas, antialias: true, maxDevicePixelRatio: 2 });
} catch (error) {
  canvas.dataset.webglReady = "false";
  byId("stat-webgl").textContent = "Unavailable";
  commandResult.dataset.state = "error";
  commandResult.textContent =
    error instanceof Error ? error.message : "WebGL2 initialization failed.";
}

if (renderer) {
  const engine = new Engine({ renderer, scene, camera });
  const sceneLoader = new JSONSceneLoader();
  const commandBus = new CommandBus(scene, { allowDelete: true });
  const ruleProvider = new RuleBasedProvider();
  const providerLabels = {
    rule: "Offline rules",
    ollama: "Ollama",
    compatible: "OpenAI-compatible API",
  };

  const providerContext = () => ({
    scene,
    ...(state.selected?.name ? { selectedObjectName: state.selected.name } : {}),
  });

  const saveProviderSettings = (mode) => {
    if (mode !== "ollama" && mode !== "compatible") return;
    state.providerSettings[mode] = {
      endpoint: byId("provider-endpoint").value.trim(),
      model: byId("provider-model").value.trim(),
      apiKey: byId("provider-api-key").value,
    };
  };

  const validateProviderEndpoint = (value) => {
    let endpoint;
    try {
      endpoint = new URL(value);
    } catch {
      throw new Error("Provider endpoint must be a complete HTTP or HTTPS URL.");
    }
    if (!["http:", "https:"].includes(endpoint.protocol)) {
      throw new Error("Provider endpoint must use HTTP or HTTPS.");
    }
    return endpoint.href.replace(/\/$/, "");
  };

  const providerConfiguration = () => {
    const endpoint = validateProviderEndpoint(byId("provider-endpoint").value.trim());
    const model = byId("provider-model").value.trim();
    if (!model) throw new Error("Provider model is required.");
    return {
      endpoint,
      model,
      apiKey: byId("provider-api-key").value,
    };
  };

  const activeProvider = () => {
    if (state.providerMode === "rule") return ruleProvider;
    const configuration = providerConfiguration();
    if (state.providerMode === "ollama") {
      return new OllamaProvider({
        baseUrl: configuration.endpoint,
        model: configuration.model,
      });
    }
    return new OpenAICompatibleProvider({
      baseUrl: configuration.endpoint,
      model: configuration.model,
      ...(configuration.apiKey ? { apiKey: configuration.apiKey } : {}),
    });
  };

  const setProviderStatus = (detail, stateName = "") => {
    const label = providerLabels[state.providerMode] ?? "AI provider";
    byId("provider-pill").textContent = `${label} · ${detail}`;
    byId("provider-pill").dataset.state = stateName;
    byId("provider-kicker").textContent =
      state.providerMode === "rule" ? "Validated offline provider" : `Validated ${label}`;
  };

  const setProviderMode = (mode) => {
    saveProviderSettings(state.providerMode);
    state.providerMode = mode;
    const remote = mode === "ollama" || mode === "compatible";
    byId("remote-provider-fields").hidden = !remote;
    byId("provider-key-field").hidden = mode !== "compatible";
    if (remote) {
      const settings = state.providerSettings[mode];
      byId("provider-endpoint").value = settings.endpoint;
      byId("provider-model").value = settings.model;
      byId("provider-api-key").value = settings.apiKey;
      byId("provider-settings").open = true;
      setProviderStatus("not tested", "idle");
      byId("provider-result").textContent =
        mode === "ollama"
          ? "Start Ollama locally and allow this site origin with OLLAMA_ORIGINS."
          : "Enter a compatible endpoint and model. API keys remain in this tab's memory only.";
    } else {
      setProviderStatus("ready", "success");
      byId("provider-result").textContent = "Offline rules do not require a network or API key.";
    }
    logActivity("provider", `Provider selected: ${providerLabels[mode]}`);
  };

  const requestWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const testProviderConnection = async () => {
    const result = byId("provider-result");
    if (state.providerMode === "rule") {
      setProviderStatus("ready", "success");
      result.dataset.state = "success";
      result.textContent = "Offline RuleBasedProvider is ready.";
      return;
    }
    result.dataset.state = "";
    result.textContent = "Connecting…";
    setProviderStatus("testing", "idle");
    try {
      const configuration = providerConfiguration();
      const headers = {};
      if (state.providerMode === "compatible" && configuration.apiKey) {
        headers.authorization = `Bearer ${configuration.apiKey}`;
      }
      const path = state.providerMode === "ollama" ? "/api/tags" : "/models";
      const response = await requestWithTimeout(`${configuration.endpoint}${path}`, { headers });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
      saveProviderSettings(state.providerMode);
      setProviderStatus("connected", "success");
      result.dataset.state = "success";
      result.textContent = `${providerLabels[state.providerMode]} connection succeeded.`;
      logActivity("provider", `${providerLabels[state.providerMode]} connection succeeded`);
    } catch (error) {
      setProviderStatus("unavailable", "error");
      result.dataset.state = "error";
      result.textContent =
        error instanceof Error
          ? `${error.message} Check the endpoint, service state and CORS permission.`
          : "Provider connection failed.";
      logActivity("error", "Provider connection failed", result.textContent);
    }
  };

  const sceneSnapshot = () => sceneLoader.stringify(scene);

  const objectList = () => {
    const objects = [];
    scene.traverse((object) => {
      if (object !== scene) objects.push(object);
    });
    return objects;
  };

  const firstObject = () =>
    objectList().find((object) => object instanceof Mesh) ?? objectList()[0];

  const uniqueName = (preferred) => {
    let name = preferred;
    let suffix = 2;
    while (scene.getObjectsByName(name).length > 0) {
      name = `${preferred}-${suffix}`;
      suffix += 1;
    }
    return name;
  };

  const addFloor = () => {
    const floor = makeMesh("plane", "floor", [0.1, 0.15, 0.19, 1], 12);
    floor.position.set(0, -1.35, 0);
    floor.rotation.set(-Math.PI / 2, 0, 0);
    floor.material.side = "double";
    scene.add(floor);
    return floor;
  };

  const clearScene = () => {
    scene.clear();
    state.selected = null;
    commandBus.selectedObject = null;
  };

  const loadPreset = (name) => {
    clearScene();
    scene.background.set(0.025, 0.045, 0.065, 1);

    if (name === "gallery") {
      const colors = [
        [0.18, 0.72, 1, 1],
        [0.98, 0.36, 0.22, 1],
        [0.48, 0.85, 0.4, 1],
        [0.72, 0.38, 0.96, 1],
        [1, 0.72, 0.2, 1],
      ];
      colors.forEach((color, index) => {
        const shape = index % 2 === 0 ? "sphere" : "box";
        const mesh = makeMesh(shape, `${shape}-${index + 1}`, color);
        mesh.position.set((index - 2) * 1.45, index % 2 === 0 ? 0 : -0.25, 0);
        scene.add(mesh);
      });
      addFloor();
    } else if (name === "hierarchy") {
      const rig = new Object3D();
      rig.name = "orbital-rig";
      const core = makeMesh("box", "core", [0.15, 0.76, 0.68, 1], 1.25);
      const moonA = makeMesh("sphere", "moon-a", [1, 0.54, 0.18, 1], 0.8);
      const moonB = makeMesh("sphere", "moon-b", [0.55, 0.4, 1, 1], 0.55);
      moonA.position.set(2.2, 0.3, 0);
      moonB.position.set(-2.4, -0.2, 0.4);
      moonA.userData["playgroundMotion"] = {
        type: "orbit",
        speed: 0.8,
        amplitude: 2.2,
        base: [0, 0.3, 0],
      };
      moonB.userData["playgroundMotion"] = {
        type: "orbit",
        speed: -0.55,
        amplitude: 2.4,
        base: [0, -0.2, 0.4],
      };
      rig.add(core, moonA, moonB);
      scene.add(rig);
      addFloor();
    } else if (name === "performance") {
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          const hue = (row * 5 + column) / 25;
          const cube = makeMesh("box", `cell-${row + 1}-${column + 1}`, [
            0.2 + hue * 0.55,
            0.75 - hue * 0.35,
            0.9 - hue * 0.2,
            1,
          ]);
          cube.scale.set(0.65, 0.65, 0.65);
          cube.position.set((column - 2) * 1.15, (row - 2) * 1.15, 0);
          scene.add(cube);
        }
      }
    } else {
      const cube = makeMesh("box", "cube", [0.2, 0.7, 1, 1]);
      const sphere = makeMesh("sphere", "sphere", [1, 0.42, 0.2, 1]);
      sphere.position.set(2, 0, 0);
      scene.add(cube, sphere);
      addFloor();
    }

    state.selected = firstObject() ?? null;
    commandBus.selectedObject = state.selected;
    state.playhead = 0;
  };

  const restoreSnapshot = (snapshot) => {
    const parsed = sceneLoader.parse(JSON.parse(snapshot));
    clearScene();
    scene.background.copy(parsed.background);
    for (const child of [...parsed.children]) scene.add(child);
    state.selected = firstObject() ?? null;
    commandBus.selectedObject = state.selected;
    state.playhead = 0;
    refreshWorkspace();
  };

  const recordHistory = (label, before) => {
    if (before === sceneSnapshot()) return;
    state.undo.push({ label, snapshot: before });
    if (state.undo.length > 40) state.undo.shift();
    state.redo.length = 0;
    syncHistoryButtons();
    logActivity("change", label);
  };

  const mutateScene = (label, mutation) => {
    const before = sceneSnapshot();
    mutation();
    recordHistory(label, before);
    refreshWorkspace();
  };

  const undo = () => {
    const entry = state.undo.pop();
    if (!entry) return;
    state.redo.push({ label: entry.label, snapshot: sceneSnapshot() });
    restoreSnapshot(entry.snapshot);
    logActivity("undo", `Undid: ${entry.label}`);
    syncHistoryButtons();
  };

  const redo = () => {
    const entry = state.redo.pop();
    if (!entry) return;
    state.undo.push({ label: entry.label, snapshot: sceneSnapshot() });
    restoreSnapshot(entry.snapshot);
    logActivity("redo", `Redid: ${entry.label}`);
    syncHistoryButtons();
  };

  const syncHistoryButtons = () => {
    byId("undo-action").disabled = state.undo.length === 0;
    byId("redo-action").disabled = state.redo.length === 0;
    byId("undo-action").title = state.undo.at(-1)
      ? `Undo ${state.undo.at(-1).label}`
      : "Nothing to undo";
    byId("redo-action").title = state.redo.at(-1)
      ? `Redo ${state.redo.at(-1).label}`
      : "Nothing to redo";
  };

  const logActivity = (type, message, detail = "") => {
    state.activity.unshift({
      type,
      message,
      detail,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    if (state.activity.length > 40) state.activity.length = 40;
    renderActivity();
  };

  const renderActivity = () => {
    const log = byId("activity-log");
    log.replaceChildren();
    if (state.activity.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "Actions, validation results and errors will appear here.";
      log.append(empty);
    } else {
      for (const item of state.activity) {
        const row = document.createElement("li");
        row.dataset.type = item.type;
        const content = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = item.message;
        const detail = document.createElement("small");
        detail.textContent = item.detail;
        content.append(title, detail);
        const time = document.createElement("time");
        time.textContent = item.time;
        row.append(content, time);
        log.append(row);
      }
    }
    byId("activity-count").textContent = String(state.activity.length);
  };

  const completeGuideStep = (step) => {
    state.guideSteps.add(step);
    for (const item of document.querySelectorAll("[data-guide-step]")) {
      item.classList.toggle("complete", state.guideSteps.has(item.dataset.guideStep));
    }
    const progress = byId("guide-progress-bar").parentElement;
    progress.setAttribute("aria-valuenow", String(state.guideSteps.size));
    byId("guide-progress-bar").style.width = `${(state.guideSteps.size / 4) * 100}%`;
  };

  const setWorkspaceLevel = (level) => {
    if (!LEVELS.includes(level)) return;
    state.level = level;
    workspace.dataset.level = level;
    const levelIndex = LEVELS.indexOf(level);
    for (const element of document.querySelectorAll("[data-min-level]")) {
      element.hidden = LEVELS.indexOf(element.dataset.minLevel) > levelIndex;
    }
    for (const button of document.querySelectorAll("[data-workspace-level]")) {
      button.setAttribute("aria-pressed", String(button.dataset.workspaceLevel === level));
    }
    const content = LEVEL_CONTENT[level];
    byId("level-title").textContent = content.title;
    byId("workspace-mode-desc").textContent = content.description;
    if (levelIndex >= 1) completeGuideStep("level");
    if (levelIndex < 2) activateInspectorTab("object");
    if (level !== "expert") activateDockTab("command");
    if (level === "expert") {
      updateCommandTemplate();
      byId("scene-json").value = sceneSnapshot();
    }
    logActivity("level", `Workspace level: ${level}`);
  };

  const activateDockTab = (name) => {
    for (const button of document.querySelectorAll("[data-dock-tab]")) {
      const active = button.dataset.dockTab === name;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panelName of ["command", "history", "expert"]) {
      byId(`${panelName}-panel`).hidden = panelName !== name;
    }
  };

  const activateInspectorTab = (name) => {
    for (const button of document.querySelectorAll("[data-inspector-tab]")) {
      const active = button.dataset.inspectorTab === name;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panelName of ["object", "motion", "scene"]) {
      byId(`${panelName}-panel`).hidden = panelName !== name;
    }
  };

  const objectMatches = (object, query) =>
    !query ||
    object.name.toLowerCase().includes(query) ||
    object.type.toLowerCase().includes(query) ||
    object.children.some((child) => objectMatches(child, query));

  const renderOutliner = () => {
    const query = byId("object-search").value.trim().toLowerCase();
    sceneTree.replaceChildren();
    let visibleRows = 0;

    const appendObject = (object, depth) => {
      if (!objectMatches(object, query)) return;
      visibleRows += 1;
      const item = document.createElement("li");
      const row = document.createElement("div");
      row.className = "scene-tree-row";
      row.style.setProperty("--tree-depth", String(depth));
      const select = document.createElement("button");
      select.type = "button";
      select.className = "scene-object-button";
      select.dataset.objectId = String(object.id);
      select.setAttribute("aria-pressed", String(state.selected === object));
      const icon = document.createElement("span");
      icon.className = "object-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = object instanceof Mesh ? "◆" : "⌘";
      const label = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = object.name || object.type;
      const type = document.createElement("small");
      type.textContent = object instanceof Mesh ? geometryName(object.geometry) : object.type;
      label.append(name, type);
      select.append(icon, label);
      const visibility = document.createElement("button");
      visibility.type = "button";
      visibility.className = "visibility-button";
      visibility.dataset.visibilityId = String(object.id);
      visibility.setAttribute(
        "aria-label",
        `${object.visible ? "Hide" : "Show"} ${object.name || object.type}`,
      );
      visibility.title = object.visible ? "Hide object" : "Show object";
      visibility.textContent = object.visible ? "◉" : "○";
      row.append(select, visibility);
      item.append(row);
      sceneTree.append(item);
      for (const child of object.children) appendObject(child, depth + 1);
    };

    for (const child of scene.children) appendObject(child, 0);
    byId("scene-empty").hidden = visibleRows > 0;
    byId("object-count").textContent = String(objectList().length);
    byId("stat-objects").textContent = String(objectList().length);
  };

  const descendantsOf = (object) => {
    const descendants = new Set();
    object.traverse((child) => {
      if (child !== object) descendants.add(child);
    });
    return descendants;
  };

  const updateParentOptions = () => {
    const select = byId("object-parent");
    select.replaceChildren();
    const sceneOption = document.createElement("option");
    sceneOption.value = "scene";
    sceneOption.textContent = "Scene root";
    select.append(sceneOption);
    if (!state.selected) return;
    const excluded = descendantsOf(state.selected);
    excluded.add(state.selected);
    for (const object of objectList()) {
      if (excluded.has(object)) continue;
      const option = document.createElement("option");
      option.value = String(object.id);
      option.textContent = object.name || `${object.type} ${object.id}`;
      select.append(option);
    }
    select.value =
      state.selected.parent && state.selected.parent !== scene
        ? String(state.selected.parent.id)
        : "scene";
  };

  const updateInspector = () => {
    const object = state.selected;
    if (!object) {
      byId("selected-name").textContent = "No selection";
      byId("selected-type").textContent = "Click an object in the viewport or hierarchy";
      byId("viewport-selection").querySelector("strong").textContent = "None";
      byId("command-target").textContent = "No selection";
      byId("selection-marker").hidden = true;
      canvas.dataset.selectedObject = "";
      return;
    }
    byId("selected-name").textContent = object.name || object.type;
    byId("selected-type").textContent =
      object instanceof Mesh ? `Mesh · ${geometryName(object.geometry)}` : object.type;
    byId("object-name").value = object.name;
    byId("object-visible").checked = object.visible;
    byId("object-enabled").checked = object.enabled;
    inputs.px.value = object.position.x.toFixed(2);
    inputs.py.value = object.position.y.toFixed(2);
    inputs.pz.value = object.position.z.toFixed(2);
    inputs.rx.value = ((object.rotation.x * 180) / Math.PI).toFixed(1);
    inputs.ry.value = ((object.rotation.y * 180) / Math.PI).toFixed(1);
    inputs.rz.value = ((object.rotation.z * 180) / Math.PI).toFixed(1);
    inputs.sx.value = object.scale.x.toFixed(2);
    inputs.sy.value = object.scale.y.toFixed(2);
    inputs.sz.value = object.scale.z.toFixed(2);
    byId("object-id").textContent = String(object.id);
    byId("viewport-selection").querySelector("strong").textContent = object.name || object.type;
    byId("command-target").textContent = object.name || object.type;

    const isMaterialMesh = object instanceof Mesh && object.material instanceof BasicMaterial;
    byId("material-properties").hidden = !isMaterialMesh;
    byId("geometry-summary").hidden = !(object instanceof Mesh);
    if (isMaterialMesh) {
      byId("object-color").value = colorToHex(object.material.color);
      byId("object-opacity").value = String(object.material.color.a);
      byId("opacity-value").textContent = `${Math.round(object.material.color.a * 100)}%`;
      byId("material-side").value = object.material.side;
      byId("material-depth-test").checked = object.material.depthTest;
      byId("material-depth-write").checked = object.material.depthWrite;
    }
    if (object instanceof Mesh) {
      byId("geometry-name").textContent = geometryName(object.geometry);
      byId("geometry-vertices").textContent = String(object.geometry.vertexCount);
      byId("geometry-indices").textContent = String(object.geometry.index?.count ?? 0);
    }

    const motion = object.userData["playgroundMotion"];
    byId("motion-type").value =
      typeof motion === "object" && motion ? (motion.type ?? "none") : "none";
    byId("motion-speed").value =
      typeof motion === "object" && motion ? String(motion.speed ?? 1) : "1";
    byId("motion-amplitude").value =
      typeof motion === "object" && motion ? String(motion.amplitude ?? 1) : "1";
    updateMotionOutputs();
    updateParentOptions();
    updateCommandTemplate();
  };

  const selectObject = (object, guided = true) => {
    const validObject = object && scene.getObjectById(object.id) ? object : null;
    state.selected = validObject;
    commandBus.selectedObject = validObject;
    if (guided && validObject) completeGuideStep("select");
    renderOutliner();
    updateInspector();
  };

  const refreshWorkspace = () => {
    if (state.selected && !scene.getObjectById(state.selected.id)) {
      state.selected = firstObject() ?? null;
    }
    commandBus.selectedObject = state.selected;
    renderOutliner();
    updateInspector();
    syncHistoryButtons();
    byId("scene-background").value = colorToHex(scene.background);
    byId("camera-fov").value = String(camera.fov);
    byId("camera-fov-value").textContent = `${Math.round(camera.fov)}°`;
  };

  const updateSelectedTransform = () => {
    const object = state.selected;
    if (!object) return;
    object.position.set(
      readNumber(inputs.px, object.position.x),
      readNumber(inputs.py, object.position.y),
      readNumber(inputs.pz, object.position.z),
    );
    object.rotation.set(
      (readNumber(inputs.rx, 0) * Math.PI) / 180,
      (readNumber(inputs.ry, 0) * Math.PI) / 180,
      (readNumber(inputs.rz, 0) * Math.PI) / 180,
    );
    object.scale.set(
      Math.max(0.01, readNumber(inputs.sx, 1)),
      Math.max(0.01, readNumber(inputs.sy, 1)),
      Math.max(0.01, readNumber(inputs.sz, 1)),
    );
    const motion = object.userData["playgroundMotion"];
    if (typeof motion === "object" && motion) {
      motion.base = [object.position.x, object.position.y, object.position.z];
    }
    completeGuideStep("transform");
  };

  const cloneEditableObject = (source) => {
    const copy =
      source instanceof Mesh
        ? new Mesh(
            source.geometry,
            source.material instanceof BasicMaterial
              ? new BasicMaterial({
                  color: source.material.color.toArray(),
                  transparent: source.material.transparent,
                  depthTest: source.material.depthTest,
                  depthWrite: source.material.depthWrite,
                  side: source.material.side,
                })
              : source.material,
          )
        : new Object3D();
    copy.name = uniqueName(`${source.name || source.type}-copy`);
    copy.position.copy(source.position);
    copy.quaternion.copy(source.quaternion);
    copy.scale.copy(source.scale);
    copy.visible = source.visible;
    copy.enabled = source.enabled;
    copy.userData = structuredClone(source.userData);
    for (const child of source.children) copy.add(cloneEditableObject(child));
    return copy;
  };

  const normalizeNaturalAnimations = () => {
    scene.traverse((object) => {
      const animation = object.userData["animation"];
      if (
        typeof animation === "object" &&
        animation &&
        animation.property === "rotation.y" &&
        !object.userData["playgroundMotion"]
      ) {
        const duration = typeof animation.duration === "number" ? animation.duration : 2;
        object.userData["playgroundMotion"] = {
          type: "spin",
          speed: Math.max(0.1, 2 / duration),
          amplitude: 1,
          base: [object.position.x, object.position.y, object.position.z],
        };
      }
    });
  };

  const applyMotionPose = (object, playhead) => {
    const motion = object.userData["playgroundMotion"];
    if (typeof motion !== "object" || !motion || motion.type === "none") return;
    const speed = Number(motion.speed ?? 1);
    const amplitude = Number(motion.amplitude ?? 1);
    const base = Array.isArray(motion.base)
      ? motion.base
      : [object.position.x, object.position.y, object.position.z];
    if (motion.type === "bob") {
      object.position.set(
        Number(base[0] ?? 0),
        Number(base[1] ?? 0) + Math.sin(playhead * speed * Math.PI) * amplitude,
        Number(base[2] ?? 0),
      );
    } else if (motion.type === "orbit") {
      object.position.set(
        Number(base[0] ?? 0) + Math.cos(playhead * speed) * amplitude,
        Number(base[1] ?? 0),
        Number(base[2] ?? 0) + Math.sin(playhead * speed) * amplitude,
      );
    }
  };

  const updateMotionOutputs = () => {
    byId("motion-speed-value").textContent = `${Number(byId("motion-speed").value).toFixed(1)}×`;
    byId("motion-amplitude-value").textContent = Number(byId("motion-amplitude").value).toFixed(1);
  };

  const updateCommandTemplate = () => {
    const template = COMMAND_TEMPLATES[byId("command-preset").value] ?? COMMAND_TEMPLATES.move;
    const target = state.selected?.name || "cube";
    byId("structured-command").value = JSON.stringify(template(target), null, 2);
  };

  const applyCameraControls = () => {
    const controls = state.cameraControls;
    const horizontalDistance = Math.cos(controls.pitch) * controls.distance;
    camera.position.set(
      controls.target.x + Math.sin(controls.yaw) * horizontalDistance,
      controls.target.y + Math.sin(controls.pitch) * controls.distance,
      controls.target.z + Math.cos(controls.yaw) * horizontalDistance,
    );
    camera.lookAt(controls.target);
    byId("camera-distance").textContent = `${controls.distance.toFixed(1)} m`;
    canvas.dataset.cameraDistance = controls.distance.toFixed(3);
    canvas.dataset.cameraYaw = controls.yaw.toFixed(4);
    canvas.dataset.cameraPitch = controls.pitch.toFixed(4);
  };

  const syncCameraControls = (target = state.cameraControls.target) => {
    const controls = state.cameraControls;
    controls.target.copy(target);
    const offset = camera.position.clone().subtract(controls.target);
    controls.distance = Math.max(0.35, offset.length());
    controls.pitch = Math.asin(
      Math.min(1, Math.max(-1, offset.y / Math.max(controls.distance, 0.0001))),
    );
    controls.yaw = Math.atan2(offset.x, offset.z);
    applyCameraControls();
  };

  const stopAutomaticCameraOrbit = () => {
    if (!state.cameraOrbit) return;
    state.cameraOrbit = false;
    byId("camera-orbit").checked = false;
    logActivity("camera", "Automatic camera orbit disabled by direct input");
  };

  const zoomCamera = (factor) => {
    stopAutomaticCameraOrbit();
    state.cameraControls.distance = Math.min(
      80,
      Math.max(0.35, state.cameraControls.distance * factor),
    );
    applyCameraControls();
  };

  const setCameraView = (view, log = true) => {
    stopAutomaticCameraOrbit();
    const controls = state.cameraControls;
    const target = controls.target;
    const distance = Math.max(3, controls.distance);
    if (view === "front") {
      camera.position.set(target.x, target.y + distance * 0.08, target.z + distance);
    } else if (view === "top") {
      camera.position.set(target.x, target.y + distance, target.z + 0.01);
    } else {
      camera.position.set(
        target.x + distance * 0.54,
        target.y + distance * 0.39,
        target.z + distance * 0.74,
      );
    }
    camera.lookAt(target);
    syncCameraControls(target);
    if (log) logActivity("camera", `Camera view: ${view}`);
  };

  const resetCamera = () => {
    state.cameraControls.target.set(0, 0, 0);
    state.cameraControls.distance = 10.2;
    state.cameraControls.yaw = 0.63;
    state.cameraControls.pitch = 0.4;
    stopAutomaticCameraOrbit();
    applyCameraControls();
    logActivity("camera", "Camera reset");
  };

  const selectedWorldCenter = (object, out = new Vector3()) => {
    object.updateWorldMatrix(true, false);
    if (object instanceof Mesh) {
      const sphere = object.geometry.boundingSphere ?? object.geometry.computeBoundingSphere();
      return out.copy(sphere.center).applyMatrix4(object.worldMatrix);
    }
    const elements = object.worldMatrix.elements;
    return out.set(elements[12], elements[13], elements[14]);
  };

  const frameSelected = () => {
    if (!state.selected) return;
    const target = selectedWorldCenter(state.selected);
    const radius =
      state.selected instanceof Mesh
        ? (
            state.selected.geometry.boundingSphere ??
            state.selected.geometry.computeBoundingSphere()
          ).radius
        : 1;
    state.cameraControls.target.copy(target);
    state.cameraControls.distance = Math.max(2.5, radius * 4.5);
    state.cameraControls.yaw = 0.63;
    state.cameraControls.pitch = 0.38;
    stopAutomaticCameraOrbit();
    applyCameraControls();
    logActivity("camera", `Framed ${state.selected.name || state.selected.type}`);
  };

  const updateSelectionMarker = () => {
    const marker = byId("selection-marker");
    if (!state.selected) {
      marker.hidden = true;
      canvas.dataset.selectedObject = "";
      return;
    }
    const world = selectedWorldCenter(state.selected);
    const projected = camera.viewProjectionMatrix.transformPoint(world);
    const visible =
      Number.isFinite(projected.x) &&
      Number.isFinite(projected.y) &&
      projected.z >= -1 &&
      projected.z <= 1 &&
      Math.abs(projected.x) <= 1.1 &&
      Math.abs(projected.y) <= 1.1;
    marker.hidden = !visible;
    if (visible) {
      marker.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
      marker.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
    }
    canvas.dataset.selectedObject = state.selected.name || state.selected.type;
  };

  const pickObjectAt = (clientX, clientY) => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const normalizedX = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    const normalizedY = -(((clientY - bounds.top) / bounds.height) * 2 - 1);
    scene.updateWorldMatrix(false, true);
    camera.updateCameraMatrices();
    const inverseViewProjection = new Matrix4().copy(camera.viewProjectionMatrix).invert();
    const nearPoint = new Vector3(normalizedX, normalizedY, -1).applyMatrix4(inverseViewProjection);
    const farPoint = new Vector3(normalizedX, normalizedY, 1).applyMatrix4(inverseViewProjection);
    const worldRay = new Ray(nearPoint, farPoint.clone().subtract(nearPoint));
    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    scene.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      const inverseWorld = object.worldMatrix.clone().invert();
      const localOrigin = worldRay.origin.clone().applyMatrix4(inverseWorld);
      const localEnd = worldRay.at(1).applyMatrix4(inverseWorld);
      const localRay = new Ray(localOrigin, localEnd.subtract(localOrigin));
      const box = object.geometry.boundingBox ?? object.geometry.computeBoundingBox();
      const localHit = localRay.intersectBox(box);
      if (!localHit) return;
      const worldHit = localHit.applyMatrix4(object.worldMatrix);
      const distance = worldRay.origin.distanceTo(worldHit);
      if (distance < closestDistance) {
        closest = object;
        closestDistance = distance;
      }
    });

    if (closest) {
      selectObject(closest);
      logActivity("select", `Viewport selected ${closest.name || closest.type}`);
    }
    return closest;
  };

  const panCamera = (deltaX, deltaY) => {
    const scale = state.cameraControls.distance * 0.0016;
    const right = camera.quaternion.rotateVector(Vector3.RIGHT).multiplyScalar(-deltaX * scale);
    const up = camera.quaternion.rotateVector(Vector3.UP).multiplyScalar(deltaY * scale);
    state.cameraControls.target.add(right).add(up);
    applyCameraControls();
  };

  const orbitCamera = (deltaX, deltaY) => {
    state.cameraControls.yaw -= deltaX * 0.008;
    state.cameraControls.pitch = Math.min(
      Math.PI / 2 - 0.02,
      Math.max(-Math.PI / 2 + 0.02, state.cameraControls.pitch + deltaY * 0.008),
    );
    applyCameraControls();
  };

  const pointerDistance = () => {
    const pointers = [...state.pointerGesture.pointers.values()];
    if (pointers.length < 2) return 0;
    return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  };

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const gesture = state.pointerGesture;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size === 1) {
      gesture.primaryId = event.pointerId;
      gesture.startX = event.clientX;
      gesture.startY = event.clientY;
      gesture.previousX = event.clientX;
      gesture.previousY = event.clientY;
      gesture.moved = false;
      gesture.pan = event.shiftKey || event.button === 1 || event.button === 2;
    } else if (gesture.pointers.size === 2) {
      gesture.moved = true;
      gesture.pinchDistance = pointerDistance();
      gesture.pinchCameraDistance = state.cameraControls.distance;
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const gesture = state.pointerGesture;
    if (!gesture.pointers.has(event.pointerId)) return;
    event.preventDefault();
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size >= 2) {
      const distance = pointerDistance();
      if (distance > 0 && gesture.pinchDistance > 0) {
        stopAutomaticCameraOrbit();
        state.cameraControls.distance = Math.min(
          80,
          Math.max(0.35, gesture.pinchCameraDistance * (gesture.pinchDistance / distance)),
        );
        applyCameraControls();
      }
      return;
    }
    if (gesture.primaryId !== event.pointerId) return;
    const totalDistance = Math.hypot(
      event.clientX - gesture.startX,
      event.clientY - gesture.startY,
    );
    if (totalDistance > 4) gesture.moved = true;
    if (!gesture.moved) return;
    stopAutomaticCameraOrbit();
    const deltaX = event.clientX - gesture.previousX;
    const deltaY = event.clientY - gesture.previousY;
    if (gesture.pan || event.shiftKey) panCamera(deltaX, deltaY);
    else orbitCamera(deltaX, deltaY);
    gesture.previousX = event.clientX;
    gesture.previousY = event.clientY;
  });

  const endPointerGesture = (event, pick) => {
    const gesture = state.pointerGesture;
    if (!gesture.pointers.has(event.pointerId)) return;
    const shouldPick =
      pick &&
      gesture.pointers.size === 1 &&
      gesture.primaryId === event.pointerId &&
      !gesture.moved;
    gesture.pointers.delete(event.pointerId);
    if (shouldPick) pickObjectAt(event.clientX, event.clientY);
    if (gesture.primaryId === event.pointerId) gesture.primaryId = null;
    if (gesture.pointers.size < 2) {
      gesture.pinchDistance = 0;
      gesture.pinchCameraDistance = 0;
    }
  };

  canvas.addEventListener("pointerup", (event) => endPointerGesture(event, true));
  canvas.addEventListener("pointercancel", (event) => endPointerGesture(event, false));
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomCamera(Math.exp(event.deltaY * 0.0015));
    },
    { passive: false },
  );
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  const applySceneFromParsed = (parsed) => {
    clearScene();
    scene.background.copy(parsed.background);
    for (const child of [...parsed.children]) scene.add(child);
    state.selected = firstObject() ?? null;
    commandBus.selectedObject = state.selected;
    normalizeNaturalAnimations();
  };

  for (const button of document.querySelectorAll("[data-workspace-level]")) {
    button.addEventListener("click", () => setWorkspaceLevel(button.dataset.workspaceLevel));
  }

  for (const button of document.querySelectorAll("[data-dock-tab]")) {
    button.addEventListener("click", () => activateDockTab(button.dataset.dockTab));
  }

  for (const button of document.querySelectorAll("[data-inspector-tab]")) {
    button.addEventListener("click", () => activateInspectorTab(button.dataset.inspectorTab));
  }

  sceneTree.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.objectId) {
      const object = scene.getObjectById(Number(target.dataset.objectId));
      if (object) selectObject(object);
    } else if (target.dataset.visibilityId) {
      const object = scene.getObjectById(Number(target.dataset.visibilityId));
      if (!object) return;
      mutateScene(`${object.visible ? "Hide" : "Show"} ${object.name || object.type}`, () => {
        object.visible = !object.visible;
      });
    }
  });

  byId("object-search").addEventListener("input", renderOutliner);

  for (const button of document.querySelectorAll("[data-add-primitive]")) {
    button.addEventListener("click", () => {
      const shape = button.dataset.addPrimitive;
      mutateScene(`Add ${shape}`, () => {
        const object =
          shape === "group"
            ? Object.assign(new Object3D(), { name: uniqueName("group") })
            : makeMesh(
                shape,
                uniqueName(shape === "box" ? "cube" : shape),
                shape === "sphere" ? [1, 0.42, 0.2, 1] : [0.2, 0.7, 1, 1],
              );
        scene.add(object);
        selectObject(object, false);
      });
    });
  }

  byId("apply-preset").addEventListener("click", () => {
    const preset = byId("scene-preset").value;
    mutateScene(`Load ${preset} preset`, () => loadPreset(preset));
    logActivity("preset", `Loaded ${preset} scene`);
  });

  byId("duplicate-object").addEventListener("click", () => {
    if (!state.selected) return;
    const source = state.selected;
    mutateScene(`Duplicate ${source.name || source.type}`, () => {
      const duplicate = cloneEditableObject(source);
      duplicate.position.x += 0.75;
      (source.parent ?? scene).add(duplicate);
      selectObject(duplicate, false);
    });
  });

  byId("delete-object").addEventListener("click", () => {
    if (!state.selected) return;
    const target = state.selected;
    mutateScene(`Delete ${target.name || target.type}`, () => {
      target.parent?.remove(target);
      state.selected = firstObject() ?? null;
      commandBus.selectedObject = state.selected;
    });
  });

  byId("reset-transform").addEventListener("click", () => {
    if (!state.selected) return;
    mutateScene(`Reset ${state.selected.name || state.selected.type} transform`, () => {
      state.selected.position.set(0, 0, 0);
      state.selected.rotation.set(0, 0, 0);
      state.selected.scale.set(1, 1, 1);
    });
  });

  for (const input of Object.values(inputs)) {
    input.addEventListener("focus", () => {
      state.editSnapshot ??= sceneSnapshot();
    });
    input.addEventListener("input", () => {
      updateSelectedTransform();
    });
    input.addEventListener("change", () => {
      if (state.editSnapshot) {
        recordHistory(`Transform ${state.selected?.name || "object"}`, state.editSnapshot);
        state.editSnapshot = null;
      }
      updateInspector();
    });
  }

  byId("object-name").addEventListener("focus", () => {
    state.editSnapshot = sceneSnapshot();
  });
  byId("object-name").addEventListener("change", () => {
    if (!state.selected) return;
    const nextName = byId("object-name").value.trim();
    const duplicate = scene
      .getObjectsByName(nextName)
      .some((candidate) => candidate !== state.selected);
    if (!nextName || duplicate) {
      commandResult.dataset.state = "error";
      commandResult.textContent = duplicate
        ? `Object name '${nextName}' is already in use.`
        : "Object name cannot be empty.";
      byId("object-name").value = state.selected.name;
      state.editSnapshot = null;
      return;
    }
    state.selected.name = nextName;
    if (state.editSnapshot) recordHistory(`Rename object to ${nextName}`, state.editSnapshot);
    state.editSnapshot = null;
    refreshWorkspace();
  });

  for (const id of ["object-visible", "object-enabled"]) {
    byId(id).addEventListener("change", () => {
      if (!state.selected) return;
      mutateScene(`Update ${state.selected.name || state.selected.type} state`, () => {
        state.selected.visible = byId("object-visible").checked;
        state.selected.enabled = byId("object-enabled").checked;
      });
    });
  }

  byId("object-parent").addEventListener("change", () => {
    if (!state.selected) return;
    const target = state.selected;
    mutateScene(`Reparent ${target.name || target.type}`, () => {
      const parent =
        byId("object-parent").value === "scene"
          ? scene
          : scene.getObjectById(Number(byId("object-parent").value));
      if (parent) parent.add(target);
    });
  });

  const beginMaterialEdit = () => {
    state.editSnapshot ??= sceneSnapshot();
  };
  const updateMaterial = () => {
    if (!(state.selected instanceof Mesh) || !(state.selected.material instanceof BasicMaterial))
      return;
    const alpha = readNumber(byId("object-opacity"), state.selected.material.color.a);
    const [red, green, blue] = hexToColor(byId("object-color").value, alpha);
    state.selected.material.color.set(red, green, blue, alpha);
    state.selected.material.transparent = alpha < 0.999;
    state.selected.material.side = byId("material-side").value;
    state.selected.material.depthTest = byId("material-depth-test").checked;
    state.selected.material.depthWrite = byId("material-depth-write").checked;
    byId("opacity-value").textContent = `${Math.round(alpha * 100)}%`;
  };
  const commitMaterialEdit = () => {
    if (state.editSnapshot) {
      recordHistory(`Edit ${state.selected?.name || "object"} material`, state.editSnapshot);
      state.editSnapshot = null;
    }
  };
  for (const id of [
    "object-color",
    "object-opacity",
    "material-side",
    "material-depth-test",
    "material-depth-write",
  ]) {
    byId(id).addEventListener("focus", beginMaterialEdit);
    byId(id).addEventListener("input", updateMaterial);
    byId(id).addEventListener("change", () => {
      updateMaterial();
      commitMaterialEdit();
    });
  }

  byId("apply-motion").addEventListener("click", () => {
    if (!state.selected) return;
    mutateScene(`Apply motion to ${state.selected.name || state.selected.type}`, () => {
      const type = byId("motion-type").value;
      if (type === "none") {
        delete state.selected.userData["playgroundMotion"];
        delete state.selected.userData["animation"];
      } else {
        state.selected.userData["playgroundMotion"] = {
          type,
          speed: Number(byId("motion-speed").value),
          amplitude: Number(byId("motion-amplitude").value),
          base: [state.selected.position.x, state.selected.position.y, state.selected.position.z],
        };
      }
    });
  });
  for (const id of ["motion-speed", "motion-amplitude"]) {
    byId(id).addEventListener("input", updateMotionOutputs);
  }

  byId("timeline-scrubber").addEventListener("input", () => {
    state.playhead = Number(byId("timeline-scrubber").value);
    byId("timeline-value").textContent = `${state.playhead.toFixed(1)} s`;
    scene.traverse((object) => applyMotionPose(object, state.playhead));
  });

  byId("play-toggle").addEventListener("click", () => {
    state.motionPlaying = !state.motionPlaying;
    const button = byId("play-toggle");
    button.classList.toggle("active", state.motionPlaying);
    button.setAttribute("aria-pressed", String(state.motionPlaying));
    button.innerHTML = state.motionPlaying
      ? '<span aria-hidden="true">Ⅱ</span> <span>Pause motion</span>'
      : '<span aria-hidden="true">▶</span> <span>Play motion</span>';
    logActivity("motion", state.motionPlaying ? "Motion resumed" : "Motion paused");
  });

  byId("scene-background").addEventListener("change", () => {
    const before = sceneSnapshot();
    const [red, green, blue, alpha] = hexToColor(byId("scene-background").value);
    scene.background.set(red, green, blue, alpha);
    recordHistory("Change scene background", before);
  });
  byId("camera-fov").addEventListener("input", () => {
    camera.fov = Number(byId("camera-fov").value);
    camera.updateProjectionMatrix();
    byId("camera-fov-value").textContent = `${camera.fov}°`;
  });
  byId("camera-orbit").addEventListener("change", () => {
    state.cameraOrbit = byId("camera-orbit").checked;
    logActivity("camera", state.cameraOrbit ? "Camera orbit enabled" : "Camera orbit disabled");
  });

  for (const button of document.querySelectorAll("[data-camera-view]")) {
    button.addEventListener("click", () => setCameraView(button.dataset.cameraView));
  }
  byId("frame-selection").addEventListener("click", frameSelected);
  byId("zoom-in").addEventListener("click", () => zoomCamera(0.8));
  byId("zoom-out").addEventListener("click", () => zoomCamera(1.25));
  byId("reset-camera").addEventListener("click", resetCamera);
  byId("viewport-guides").addEventListener("change", () => {
    byId("viewport-guide-overlay").hidden = !byId("viewport-guides").checked;
  });
  byId("provider-mode").addEventListener("change", () => {
    setProviderMode(byId("provider-mode").value);
  });
  byId("test-provider").addEventListener("click", testProviderConnection);
  for (const id of ["provider-endpoint", "provider-model", "provider-api-key"]) {
    byId(id).addEventListener("input", () => {
      if (state.providerMode === "rule") return;
      setProviderStatus("not tested", "idle");
      byId("provider-result").dataset.state = "";
    });
  }

  commandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    commandResult.dataset.state = "";
    commandResult.textContent = "Parsing and validating command…";
    const before = sceneSnapshot();
    try {
      const provider = activeProvider();
      const commands = await provider.parseCommand(naturalCommand.value, providerContext());
      naturalPreview.textContent = JSON.stringify(commands, null, 2);
      const dryRun = byId("natural-dry-run").checked;
      const results = commandBus.executeMany(commands, { dryRun });
      const failure = results.find((item) => !item.success);
      if (failure) throw new Error(`${failure.error.code}: ${failure.error.message}`);
      normalizeNaturalAnimations();
      if (!dryRun) {
        recordHistory(`Natural language: ${naturalCommand.value}`, before);
        selectObject(commandBus.selectedObject, false);
        commandResult.textContent = `${results.length} command(s) validated and applied.`;
        completeGuideStep("command");
      } else {
        commandResult.textContent = `${results.length} command(s) validated. Dry run made no changes.`;
      }
      commandResult.dataset.state = "success";
      if (state.providerMode !== "rule") setProviderStatus("active", "success");
      logActivity(
        dryRun ? "validation" : "command",
        dryRun ? "Natural-language dry run passed" : "Natural-language command applied",
        `${commands.length} structured command(s)`,
      );
      refreshWorkspace();
    } catch (error) {
      commandResult.dataset.state = "error";
      commandResult.textContent = error instanceof Error ? error.message : "Command failed.";
      logActivity("error", "Natural-language command failed", commandResult.textContent);
    }
  });

  for (const button of document.querySelectorAll("[data-command-example]")) {
    button.addEventListener("click", () => {
      naturalCommand.value = button.dataset.commandExample;
      commandForm.requestSubmit();
    });
  }

  byId("command-preset").addEventListener("change", updateCommandTemplate);
  byId("run-structured-command").addEventListener("click", () => {
    const before = sceneSnapshot();
    try {
      const command = JSON.parse(byId("structured-command").value);
      const dryRun = byId("structured-dry-run").checked;
      const result = commandBus.execute(command, { dryRun });
      byId("structured-result").textContent = JSON.stringify(result, null, 2);
      if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
      if (!dryRun) {
        recordHistory(`Structured command: ${command.command}`, before);
        const object = result.targetId ? scene.getObjectById(result.targetId) : null;
        if (object) selectObject(object, false);
        normalizeNaturalAnimations();
      }
      logActivity(
        dryRun ? "validation" : "command",
        `${command.command} ${dryRun ? "validated" : "executed"}`,
      );
      refreshWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Structured command failed.";
      byId("structured-result").textContent = JSON.stringify(
        { success: false, error: message },
        null,
        2,
      );
      logActivity("error", "Structured command failed", message);
    }
  });

  byId("export-scene").addEventListener("click", () => {
    byId("scene-json").value = sceneSnapshot();
    byId("scene-json-result").textContent = "Scene JSON refreshed from the live scene.";
    logActivity("export", "Scene serialized to JSON");
  });
  byId("import-scene").addEventListener("click", () => {
    const before = sceneSnapshot();
    try {
      const parsed = sceneLoader.parse(JSON.parse(byId("scene-json").value));
      applySceneFromParsed(parsed);
      recordHistory("Apply scene JSON", before);
      byId("scene-json-result").textContent = "Scene JSON validated and applied.";
      logActivity("import", "Scene JSON applied");
      refreshWorkspace();
    } catch (error) {
      byId("scene-json-result").textContent =
        error instanceof Error ? error.message : "Scene JSON could not be applied.";
      logActivity("error", "Scene JSON rejected", byId("scene-json-result").textContent);
    }
  });

  byId("clear-activity").addEventListener("click", () => {
    state.activity.length = 0;
    renderActivity();
  });
  byId("undo-action").addEventListener("click", undo);
  byId("redo-action").addEventListener("click", redo);
  byId("reset-scene").addEventListener("click", () => {
    mutateScene("Reset starter scene", () => loadPreset("starter"));
    commandResult.dataset.state = "success";
    commandResult.textContent = "Scene reset. Use Undo to restore the previous scene.";
  });

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    renderer.setSize(bounds.width, bounds.height, false);
    camera.resize(bounds.width, bounds.height);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  engine.onUpdate((deltaTime) => {
    if (state.motionPlaying) {
      state.playhead = (state.playhead + deltaTime) % 10;
      scene.traverse((object) => {
        const motion = object.userData["playgroundMotion"];
        if (typeof motion !== "object" || !motion) return;
        if (motion.type === "spin") object.rotateY(deltaTime * Number(motion.speed ?? 1));
        else applyMotionPose(object, state.playhead);
      });
      byId("timeline-scrubber").value = String(state.playhead);
      byId("timeline-value").textContent = `${state.playhead.toFixed(1)} s`;
    }
    if (state.cameraOrbit) {
      state.cameraControls.yaw += deltaTime * 0.25;
      applyCameraControls();
    }

    state.framesSinceStats += 1;
    const now = performance.now();
    if (now - state.lastStatsUpdate > 500) {
      const elapsed = Math.max(1, now - state.lastStatsUpdate);
      byId("stat-fps").textContent = String(Math.round((state.framesSinceStats * 1000) / elapsed));
      byId("stat-draws").textContent = String(renderer.drawCalls);
      canvas.dataset.drawCalls = String(renderer.drawCalls);
      state.framesSinceStats = 0;
      state.lastStatsUpdate = now;
    }
  });
  engine.onRender(() => {
    scene.updateWorldMatrix(false, true);
    camera.updateCameraMatrices();
    updateSelectionMarker();
  });

  window.addEventListener(
    "beforeunload",
    () => {
      resizeObserver.disconnect();
      engine.dispose();
    },
    { once: true },
  );

  const initialParameters = new URLSearchParams(window.location.search);
  const requestedLevel = initialParameters.get("level");
  const initialLevel = LEVELS.includes(requestedLevel) ? requestedLevel : "beginner";
  const requestedCommand = initialParameters.get("command");

  try {
    loadPreset("starter");
    resize();
    syncCameraControls(new Vector3());
    refreshWorkspace();
    renderActivity();
    updateCommandTemplate();
    setWorkspaceLevel(initialLevel);
    setProviderMode("rule");
    if (requestedCommand) naturalCommand.value = requestedCommand;
    selectObject(state.selected, false);
    engine.start();
    canvas.dataset.webglReady = "true";
    byId("stat-webgl").textContent = "WebGL2";
    logActivity(
      "system",
      "Starter scene ready",
      "WebGL2 renderer · offline rules · optional Ollama or compatible API",
    );
  } catch (error) {
    canvas.dataset.webglReady = "false";
    byId("stat-webgl").textContent = "Unavailable";
    commandResult.dataset.state = "error";
    commandResult.textContent =
      error instanceof Error ? error.message : "WebGL2 initialization failed.";
  }
}
