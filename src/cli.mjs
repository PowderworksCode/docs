#!/usr/bin/env node
// powderworks-docs — turn a tree of markdown into a tree of indexes.
//
//   powderworks-docs build <contentDir> --out <outDir> [options]
//
// Every directory is a section; every section gets an index page listing its
// children. The only script emitted is the one that copies a code block.

import { build } from "./build.mjs";

const args = process.argv.slice(2);
const command = args.shift();

function usage() {
  console.log(`Usage: powderworks-docs build <contentDir> --out <outDir> [options]

Options:
  --site-url <url>     Canonical origin, for <link rel=canonical> and sitemap
  --name <name>        Site name (default: first heading or "docs")
  --description <text> Meta description for the root page
  --github <owner/repo|url>  Footer repository link
  --logo <path>        Small mark beside the site name and as favicon
  --static <dir>       Directory copied verbatim into the output
  --license <text>     Footer license line
  --copyright <name>   Footer copyright, as (c) <year> <name>, replacing the above
  --wordmark <text>    Set this word in the wordmark face wherever it appears
  --wordmark-font <family>  CSS family for it, e.g. "Manufacturing Consent"
  --wordmark-css <url>      Stylesheet that serves that family
  -h, --help`);
}

if (command !== "build" || args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(command === "build" ? 0 : 2);
}

function option(name) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args.splice(index, 2)[1];
  if (!value) throw new Error(`--${name} requires a value`);
  return value;
}

const contentDir = args.shift();
const outDir = option("out");
if (!contentDir || !outDir) {
  usage();
  process.exit(2);
}

try {
  await build(contentDir, outDir, {
    siteUrl: option("site-url")?.replace(/\/$/, ""),
    name: option("name"),
    description: option("description"),
    github: option("github"),
    staticDir: option("static"),
    license: option("license"),
    copyright: option("copyright"),
    wordmark: option("wordmark"),
    wordmarkFont: option("wordmark-font"),
    wordmarkCss: option("wordmark-css"),
    logo: option("logo"),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}
