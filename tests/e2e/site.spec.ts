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
  await expect(page.locator("#playground-canvas")).toHaveAttribute("data-draw-calls", "1");
  await page.locator("#position-x").fill("1.5");
  await expect(page.locator("#position-x")).toHaveValue("1.5");
  await page.locator("#natural-command").fill("큐브를 위로 1 이동");
  await page.getByRole("button", { name: "Validate and run" }).click();
  await expect(page.locator("#command-result")).toHaveAttribute("data-state", "success");
  await expect(page.locator("#position-y")).toHaveValue("1.00");
  await page.getByRole("button", { name: "Reset scene" }).click();
  await expect(page.locator("#position-x")).toHaveValue("0.00");
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
