import { expect, test } from "@playwright/test";

test("home loads the WebGL2 demo and primary links", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Build 3D for the web/ })).toBeVisible();
  const canvas = page.locator("#engine-demo");
  await expect(canvas).toHaveAttribute("data-webgl-ready", "true");
  await expect(canvas).toHaveAttribute("data-draw-calls", "1");
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(300);
  expect(box?.height).toBeGreaterThan(250);
  await expect(page.getByRole("link", { name: "Start building" })).toHaveAttribute(
    "href",
    "./docs.html#get-started",
  );
  expect(errors).toEqual([]);
});

test("playground edits transforms and runs an offline natural-language command", async ({
  page,
}) => {
  await page.goto("./playground.html");
  await expect(page.locator("#playground-canvas")).toHaveAttribute("data-webgl-ready", "true");
  await expect(page.locator("#playground-canvas")).toHaveAttribute("data-draw-calls", /^[1-9]\d*$/);
  await page.locator("#position-x").fill("1.5");
  await expect(page.locator("#position-x")).toHaveValue("1.5");
  await page.locator("#natural-command").fill("큐브를 위로 1 이동");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#command-result")).toHaveAttribute("data-state", "success");
  await expect(page.locator("#position-y")).toHaveValue("1.00");
  await expect(page.locator("#natural-command-preview")).toContainText("moveObject");
  await page.getByRole("button", { name: "Reset scene" }).click();
  await expect(page.locator("#position-x")).toHaveValue("0.00");
});

test("playground supports viewport picking, orbit, pan and zoom", async ({ page }) => {
  await page.goto("./playground.html");
  const canvas = page.locator("#playground-canvas");
  const initialDistance = Number(await canvas.getAttribute("data-camera-distance"));
  const initialYaw = await canvas.getAttribute("data-camera-yaw");

  await canvas.hover();
  await page.mouse.wheel(0, -320);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-camera-distance")))
    .toBeLessThan(initialDistance);

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) return;
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.62,
    canvasBox.y + canvasBox.height * 0.58,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-camera-yaw", initialYaw ?? "");

  await page.getByRole("button", { name: "Reset view" }).click();
  await page.locator(".scene-object-button").filter({ hasText: "sphere" }).click();
  await expect(page.locator("#selected-name")).toHaveText("sphere");
  const markerBox = await page.locator("#selection-marker").boundingBox();
  expect(markerBox).not.toBeNull();
  if (!markerBox) return;
  const spherePoint = {
    x: markerBox.x + markerBox.width / 2,
    y: markerBox.y + markerBox.height / 2,
  };
  await page.locator(".scene-object-button").filter({ hasText: "cube" }).click();
  await page.mouse.click(spherePoint.x, spherePoint.y);
  await expect(page.locator("#selected-name")).toHaveText("sphere");
  await expect(canvas).toHaveAttribute("data-selected-object", "sphere");
});

test("selected-object language and an Ollama provider share validated scene context", async ({
  page,
}) => {
  let providerRequest = "";
  await page.route("**/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "qwen3:8b" }] }),
    });
  });
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-allow-private-network": "true",
        },
      });
      return;
    }
    providerRequest = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-private-network": "true",
      },
      body: JSON.stringify({
        message: {
          content: JSON.stringify([
            {
              version: "1.0",
              command: "moveObject",
              target: { name: "sphere" },
              parameters: { x: 0, y: 1, z: 0, space: "world" },
            },
          ]),
        },
      }),
    });
  });

  await page.goto("./playground.html");
  await page.locator("#natural-command").fill("구를 선택해");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#selected-name")).toHaveText("sphere");
  await page.locator("#natural-command").fill("선택한 객체를 위로 1 이동");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#selected-name")).toHaveText("sphere");
  await expect(page.locator("#position-y")).toHaveValue("1.00");

  await page.locator("#provider-settings").click();
  await page.locator("#provider-mode").selectOption("ollama");
  const providerEndpoint = new URL("./mock-ollama", page.url()).href.replace(/\/$/, "");
  await page.locator("#provider-endpoint").fill(providerEndpoint);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.locator("#provider-result")).toHaveAttribute("data-state", "success");
  await page.locator("#natural-command").fill("선택한 객체를 위로 이동");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#command-result")).toHaveAttribute("data-state", "success");
  expect(providerRequest).toContain('\\"selectedObjectName\\":\\"sphere\\"');
  expect(providerRequest).toContain('\\"name\\":\\"sphere\\"');

  await page.locator("#provider-mode").selectOption("compatible");
  await page.locator("#provider-endpoint").fill("https://provider.example/v1");
  await page.locator("#provider-model").fill("command-model");
  await page.locator("#provider-api-key").fill("tab-memory-only");
  await expect(page.locator("#provider-api-key")).toHaveAttribute("type", "password");
  const storedValues = await page.evaluate(() => {
    const values = (storage: Storage) =>
      Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index);
        return key ? storage.getItem(key) : "";
      }).join(" ");
    return `${values(localStorage)} ${values(sessionStorage)}`;
  });
  expect(storedValues).not.toContain("tab-memory-only");
});

test("playground progressively reveals builder, motion and expert tools", async ({ page }) => {
  await page.goto("./playground.html");
  const objectCount = page.locator("#object-count");
  await expect(objectCount).toHaveText("3");
  await expect(page.locator('[data-add-primitive="sphere"]')).toBeHidden();

  await page.locator('[data-workspace-level="builder"]').click();
  await page.locator('[data-add-primitive="sphere"]').click();
  await expect(objectCount).toHaveText("4");
  await expect(page.locator("#selected-name")).toHaveText("sphere-2");
  await page.getByRole("button", { name: "Duplicate object" }).click();
  await expect(objectCount).toHaveText("5");
  await page.getByRole("button", { name: /Undo/ }).click();
  await expect(objectCount).toHaveText("4");
  await page.getByRole("button", { name: /Redo/ }).click();
  await expect(objectCount).toHaveText("5");

  await page.locator('[data-workspace-level="advanced"]').click();
  await page.getByRole("tab", { name: "Motion" }).click();
  await page.locator("#motion-type").selectOption("spin");
  await page.getByRole("button", { name: "Apply motion" }).click();

  await page.locator('[data-workspace-level="expert"]').click();
  await page.getByRole("tab", { name: "Structured command" }).click();
  await page.getByRole("button", { name: "Validate command" }).click();
  await expect(page.locator("#structured-result")).toContainText('"success": true');
  await expect(page.locator("#structured-result")).toContainText('"dryRun": true');
});

test("natural language creates, styles, moves and animates a new object", async ({ page }) => {
  await page.goto("./playground.html?level=advanced");
  await page
    .locator("#natural-command")
    .fill("빨간 구를 만들어 오른쪽으로 2 이동하고 천천히 회전시켜");
  await page.getByRole("button", { name: "Validate and run" }).click();

  await expect(page.locator("#command-result")).toHaveText("4 command(s) validated and applied.");
  await expect(page.locator("#selected-name")).toHaveText("sphere-2");
  await expect(page.locator("#position-x")).toHaveValue("2.00");
  await expect(page.locator("#object-color")).toHaveValue("#f23333");
  await page.getByRole("tab", { name: "Motion" }).click();
  await expect(page.locator("#motion-type")).toHaveValue("spin");
  await expect(page.locator("#natural-command-preview")).toContainText("createObject");
  await expect(page.locator("#natural-command-preview")).toContainText("animateObject");
});

test("compound models can be created, transformed, selected by part and built with language", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./playground.html?level=builder&preset=transform-lab");
  await expect(page.locator("#selected-name")).toHaveText("rotated-box");
  await expect(page.locator("#rotation-y")).toHaveValue("45.0");

  await page.locator('[data-add-model="car"]').click();
  await expect(page.locator("#selected-name")).toHaveText("car");
  await expect(page.locator("#object-count")).toHaveText("27");
  await page.locator("#position-x").fill("2");
  await page.locator("#rotation-y").fill("30");
  await page.locator("#scale-y").fill("1.25");
  await expect(page.locator("#position-x")).toHaveValue("2.00");
  await expect(page.locator("#rotation-y")).toHaveValue("30.0");
  await expect(page.locator("#scale-y")).toHaveValue("1.25");

  await page.locator(".scene-object-button").filter({ hasText: "car-front-left-wheel" }).click();
  await expect(page.locator("#selected-name")).toHaveText("car-front-left-wheel");

  await page.locator('[data-add-model="person"]').click();
  await expect(page.locator("#selected-name")).toHaveText("person");
  await expect(
    page.locator(".scene-object-button").filter({ hasText: "person-left-hand" }),
  ).toBeVisible();

  await page.locator("#natural-command").fill("사람 얼굴을 만들어 왼쪽으로 1 이동하고 30도 회전");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#command-result")).toHaveText("3 command(s) validated and applied.");
  await expect(page.locator("#selected-name")).toHaveText("face");
  await expect(page.locator("#position-x")).toHaveValue("-1.00");
  await expect(
    page.locator(".scene-object-button").filter({ hasText: "face-mouth" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("example library filters and exposes complete verified source", async ({ page }) => {
  await page.goto("./examples.html");
  await expect(page.locator("#example-count")).toHaveText("20 of 20 examples");
  await page.locator('[data-example-level="expert"]').click();
  await expect(page.locator("#example-count")).toHaveText("4 of 20 examples");
  await page.getByRole("button", { name: /Natural-language scene recipe/ }).click();
  await expect(page.locator("#source-code")).toContainText("const recipe");
  await expect(page.locator("#source-code")).toContainText("controller.execute");
  await expect(page.locator("#source-playground")).toHaveAttribute(
    "href",
    /playground\.html\?level=advanced/,
  );
});

test("Korean guide exposes runnable modeling and provider instructions", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./guide-ko.html");
  await expect(
    page.getByRole("heading", { name: "Verbis3D를 처음부터 사용해 보세요." }),
  ).toBeVisible();
  await expect(page.locator("#compound")).toContainText("자동차는 22개");
  await expect(page.locator("#natural-language")).toContainText("EngineCommand");
  await expect(page.getByRole("link", { name: "자동차 편집" })).toHaveAttribute(
    "href",
    /preset=car-workshop/,
  );
  expect(errors).toEqual([]);
});

test("Korean guide remains readable without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./guide-ko.html");
  await expect(
    page.getByRole("heading", { name: "Verbis3D를 처음부터 사용해 보세요." }),
  ).toBeVisible();
  const widthState = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widthState.document).toBeLessThanOrEqual(widthState.viewport);
});

test("mobile navigation and docs remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./docs.html");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.click();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveAttribute(
    "data-open",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Build your first Verbis3D scene." }),
  ).toBeVisible();
});

test("playground remains usable without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./playground.html");
  await expect(page.locator("#playground-canvas")).toHaveAttribute("data-webgl-ready", "true");
  await expect(page.locator(".level-switcher")).toBeVisible();
  const widthState = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widthState.document).toBeLessThanOrEqual(widthState.viewport);
  await page.locator('[data-workspace-level="builder"]').click();
  await expect(page.locator('[data-add-primitive="sphere"]')).toBeVisible();
  await expect(page.locator('[data-add-model="car"]')).toBeVisible();
  await expect(page.locator('[data-add-model="person"]')).toBeVisible();
  await expect(page.locator('[data-add-model="tree"]')).toBeVisible();
});
