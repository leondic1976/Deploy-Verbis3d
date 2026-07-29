import { cp, stat } from "node:fs/promises";

try {
  await stat("site/api");
  await cp("site/api", "site-dist/api", { recursive: true, force: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
