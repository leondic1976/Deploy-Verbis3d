import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN_ENGINES = ["three", "@babylonjs", "babylonjs", "playcanvas", "aframe", "cesium"];

function TypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? TypeScriptFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("independent engine boundary", () => {
  it("has no runtime dependency on a completed 3D engine", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const runtimePackages = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ];
    expect(
      runtimePackages.filter((name) =>
        FORBIDDEN_ENGINES.some((engine) => name === engine || name.startsWith(`${engine}/`)),
      ),
    ).toEqual([]);
  });

  it("does not import a completed 3D engine from core source", () => {
    const source = TypeScriptFiles("src")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const engine of FORBIDDEN_ENGINES) {
      expect(source).not.toMatch(new RegExp(`(?:from|import\\()\\s*["']${engine}(?:/|["'])`));
    }
  });
});
