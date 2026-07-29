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

test("example library filters and exposes complete verified source", async ({ page }) => {
  await page.goto("./examples.html");
  await expect(page.locator("#example-count")).toHaveText("16 of 16 examples");
  await page.locator('[data-example-level="expert"]').click();
  await expect(page.locator("#example-count")).toHaveText("4 of 16 examples");
  await page.getByRole("button", { name: /Natural-language scene recipe/ }).click();
  await expect(page.locator("#source-code")).toContainText("const recipe");
  await expect(page.locator("#source-code")).toContainText("controller.execute");
  await expect(page.locator("#source-playground")).toHaveAttribute(
    "href",
    /playground\.html\?level=advanced/,
  );
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
});
