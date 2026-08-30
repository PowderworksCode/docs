// The emitted Markdown sources carry frontmatter of their own. A value that is
// written plain but means something else in YAML leaves the emitted file
// impossible to parse, which stays invisible until a reader stricter than this
// generator picks it up.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: check-frontmatter <out-dir>");
  process.exit(2);
}

async function* sources(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(full);
    else if (entry.name.endsWith(".md")) yield full;
  }
}

let failures = 0;
for await (const file of sources(root)) {
  const source = await readFile(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) continue;
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (!pair) {
      console.error(`${file}: frontmatter line is not a key/value pair: ${line}`);
      failures += 1;
      continue;
    }
    const value = pair[2];
    if (value.startsWith('"')) continue;
    if (/:\s/.test(value) || value.endsWith(":") || /^[-?:,[\]{}#&*!|>'%@`]/.test(value)) {
      console.error(`${file}: ${pair[1]} needs quoting: ${value}`);
      failures += 1;
    }
  }
}

if (failures) {
  console.error(`${failures} frontmatter value(s) emitted unquoted that should not be`);
  process.exit(1);
}
console.log("frontmatter: every emitted value is unambiguous");
