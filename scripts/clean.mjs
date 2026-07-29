import { rm } from "node:fs/promises";

for (const path of ["dist", "coverage", "site-dist", "site/api", "test-results"]) {
  await rm(path, { recursive: true, force: true });
}
