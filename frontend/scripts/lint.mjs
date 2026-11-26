import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const scanRoots = [join(root, "src"), join(root, "e2e")];
const allowedExtensions = new Set([".ts", ".tsx", ".mjs"]);
const forbidden = /\b(?:TODO|FIXME|XXX)\b/i;
// Only flag actual `any` type usage, not prose or string literals containing the word.
const nonTestAny = /(:\s*any\b|<\s*any\s*>|\bas\s+any\b|\bany\s*\[\])/;

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(fullPath)));
    } else if (allowedExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations = [];
for (const scanRoot of scanRoots) {
  for (const file of await collect(scanRoot)) {
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");
    const isTest = /\.(test|spec)\.tsx?$/.test(file);
    lines.forEach((line, index) => {
      const location = `${relative(root, file)}:${index + 1}`;
      const trimmed = line.trimStart();
      const isComment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
      if (forbidden.test(line) && !line.includes("forbidden")) {
        violations.push(`${location} contains a placeholder marker`);
      }
      if (!isTest && !isComment && nonTestAny.test(line)) {
        violations.push(`${location} uses \`any\` outside tests`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Lint failed:\n" + violations.map((item) => `  - ${item}`).join("\n"));
  process.exit(1);
}

console.log("Lint passed: no placeholder markers and no `any` outside tests.");
