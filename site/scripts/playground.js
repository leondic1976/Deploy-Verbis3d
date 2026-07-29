import {
  BasicMaterial,
  BoxGeometry,
  CommandBus,
  Engine,
  JSONSceneLoader,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RuleBasedProvider,
  Scene,
  SphereGeometry,
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
      byId("selected-type").textContent = "Choose an object in the hierarchy";
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
    state.selected = object;
    commandBus.selectedObject = object;
    if (guided) completeGuideStep("select");
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

  const setCameraView = (view) => {
    if (view === "front") camera.position.set(0, 0.8, 8);
    else if (view === "top") camera.position.set(0, 9, 0.01);
    else camera.position.set(5.5, 4, 7.5);
    camera.lookAt({ x: 0, y: 0, z: 0 });
    logActivity("camera", `Camera view: ${view}`);
  };

  const frameSelected = () => {
    if (!state.selected) return;
    state.selected.updateWorldMatrix(true, false);
    const elements = state.selected.worldMatrix.elements;
    const target = { x: elements[12], y: elements[13], z: elements[14] };
    camera.position.set(target.x + 3.6, target.y + 2.4, target.z + 4.8);
    camera.lookAt(target);
    logActivity("camera", `Framed ${state.selected.name || state.selected.type}`);
  };

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
  byId("viewport-guides").addEventListener("change", () => {
    byId("viewport-guide-overlay").hidden = !byId("viewport-guides").checked;
  });

  commandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    commandResult.dataset.state = "";
    commandResult.textContent = "Parsing and validating command…";
    const before = sceneSnapshot();
    try {
      const commands = await ruleProvider.parseCommand(naturalCommand.value, {
        scene,
        ...(state.selected?.name ? { selectedObjectName: state.selected.name } : {}),
      });
      naturalPreview.textContent = JSON.stringify(commands, null, 2);
      const dryRun = byId("natural-dry-run").checked;
      const results = commandBus.executeMany(commands, { dryRun });
      const failure = results.find((item) => !item.success);
      if (failure) throw new Error(`${failure.error.code}: ${failure.error.message}`);
      normalizeNaturalAnimations();
      if (!dryRun) {
        recordHistory(`Natural language: ${naturalCommand.value}`, before);
        const selectedResult = [...results]
          .reverse()
          .map((item) => (item.targetId ? scene.getObjectById(item.targetId) : null))
          .find(Boolean);
        selectObject(selectedResult ?? firstObject() ?? null, false);
        commandResult.textContent = `${results.length} command(s) validated and applied.`;
        completeGuideStep("command");
      } else {
        commandResult.textContent = `${results.length} command(s) validated. Dry run made no changes.`;
      }
      commandResult.dataset.state = "success";
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

  engine.onUpdate((deltaTime, elapsedTime) => {
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
      const angle = elapsedTime * 0.25;
      camera.position.set(Math.cos(angle) * 8, 3.5, Math.sin(angle) * 8);
      camera.lookAt({ x: 0, y: 0, z: 0 });
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
    refreshWorkspace();
    renderActivity();
    updateCommandTemplate();
    setWorkspaceLevel(initialLevel);
    if (requestedCommand) naturalCommand.value = requestedCommand;
    selectObject(state.selected, false);
    engine.start();
    canvas.dataset.webglReady = "true";
    byId("stat-webgl").textContent = "WebGL2";
    logActivity("system", "Starter scene ready", "WebGL2 renderer · offline command provider");
  } catch (error) {
    canvas.dataset.webglReady = "false";
    byId("stat-webgl").textContent = "Unavailable";
    commandResult.dataset.state = "error";
    commandResult.textContent =
      error instanceof Error ? error.message : "WebGL2 initialization failed.";
  }
}
