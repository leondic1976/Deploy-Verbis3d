import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const outputDirectory = resolve("site-dist");
const deploymentBase = "/Deploy-Verbis3d/";
const failures = [];
let checkedReferences = 0;

async function collectHtmlFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }

  return files;
}

async function exists(path) {
  try {
    const details = await stat(path);
    return details.isFile() || details.isDirectory();
  } catch {
    return false;
  }
}

function isExternal(reference) {
  return /^(?:[a-z]+:|\/\/|#)/i.test(reference);
}

function resolveReference(sourceFile, reference) {
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0] ?? "");
  if (!pathname) return sourceFile;

  if (pathname.startsWith(deploymentBase)) {
    return resolve(outputDirectory, pathname.slice(deploymentBase.length));
  }

  if (pathname.startsWith("/")) {
    return resolve(outputDirectory, pathname.slice(1));
  }

  return resolve(dirname(sourceFile), pathname);
}

for (const sourceFile of await collectHtmlFiles(outputDirectory)) {
  const html = await readFile(sourceFile, "utf8");
  const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);

  for (const match of attributes) {
    const reference = match[1];
    if (!reference || isExternal(reference)) continue;

    checkedReferences += 1;
    const target = resolveReference(sourceFile, reference);
    const relativeTarget = relative(outputDirectory, target);

    if (relativeTarget.startsWith(`..${sep}`) || relativeTarget === "..") {
      failures.push(`${relative(outputDirectory, sourceFile)} -> ${reference} (outside output)`);
      continue;
    }

    const candidates = [target, resolve(target, "index.html")];
    const candidateResults = await Promise.all(candidates.map(exists));
    if (!candidateResults.some(Boolean)) {
      failures.push(`${relative(outputDirectory, sourceFile)} -> ${reference}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken local site references (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${checkedReferences} local references: no broken files.`);
}
