#!/usr/bin/env node
// powderworks-docs — turn a tree of markdown into a tree of indexes.
//
//   powderworks-docs build <contentDir> --out <outDir> [options]
//
// Every directory is a section; every section gets an index page listing its
// children. The only script emitted is the one that copies a code block.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "smol-toml";
import { build } from "./build.mjs";

const args = process.argv.slice(2);
const command = args.shift();

function usage() {
  console.log(`Usage: powderworks-docs build <contentDir> --out <outDir> [options]

Options:
  --site <key>         Take the settings below from powderworks.toml
  --config <path>      Read that file from somewhere else
  --site-url <url>     Canonical origin, for <link rel=canonical> and sitemap
  --name <name>        Site name (default: first heading or "docs")
  --description <text> Meta description for the root page
  --github <owner/repo|url>  Footer repository link
  --logo <path>        Small mark beside the site name and as favicon
  --social <path>      Card image for links to this site, shown when unfurled
  --static <dir>       Directory copied verbatim into the output
  --license <text>     Footer license line
  --copyright <name>   Footer copyright, as (c) <year> <name>, replacing the above
  --wordmark <text>    Set this word in its own face wherever it appears;
                       repeat the trio below once per word, in the same order
  --wordmark-font <family>  CSS family for it, e.g. "Manufacturing Consent"
  --wordmark-woff2 <url>    The woff2 for it, served by this site
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

// Options that may repeat, read in the order given. The wordmark trio is
// zipped by position: the first font and woff2 belong to the first word.
function every(name) {
  const found = [];
  for (let value = option(name); value !== undefined; value = option(name))
    found.push(value);
  return found;
}

const contentDir = args.shift();
const outDir = option("out");
if (!contentDir || !outDir) {
  usage();
  process.exit(2);
}

// One registry, shipped with the generator, so a name or a face is written
// once rather than in every repository that mentions it. Anything given on
// the command line still wins: the file is where a site starts, not a cage.
function registry() {
  const key = option("site");
  const where = option("config") ??
    new URL("../powderworks.toml", import.meta.url).pathname;
  if (!key) return {};
  const { org = {}, site = {} } = parse(readFileSync(where, "utf8"));
  const mine = site[key];
  if (!mine) throw new Error(`no [site.${key}] in ${where}`);
  // A site's mark and cover live beside this file rather than in the site, so
  // the workshop's own pages can show them without reaching into each repo.
  const pictures = new URL(`./assets/${key}/`, pathToFileURL(where)).pathname;
  const face = (mark) =>
    (mark?.words ?? []).map((text) => ({
      text,
      font: mark.family ? `"${mark.family}"` : undefined,
      woff2: mark.woff2,
    }));
  // The fleet, for whichever page shows it: every other site in the registry,
  // with the mark that ships beside this file.
  const beside = new URL("./assets/", pathToFileURL(where)).pathname;
  const projects = Object.entries(site)
    .filter(([slug, entry]) => slug !== key && entry.name && entry.published)
    .map(([slug, entry]) => ({
      key: slug,
      name: entry.name,
      tagline: entry.tagline,
      url: entry.url,
      repo: entry.github && `https://github.com/${entry.github}`,
      logo: markOf(beside, slug),
      font: entry.wordmark?.family && `"${entry.wordmark.family}"`,
      woff2: entry.wordmark?.woff2,
    }));

  return {
    fontsDir: new URL("./fonts/", pathToFileURL(where)).pathname,
    projectsDir: projects.some((project) => project.logo) ? beside : undefined,
    projects,
    siteUrl: mine.url?.replace(/\/$/, ""),
    name: mine.name,
    fullName: mine["full-name"],
    description: mine.tagline,
    tabTitle: mine["tab-title"],
    assetsDir: existsSync(pictures) ? pictures : undefined,
    github: mine.github,
    logo: mine.logo,
    social: mine.social,
    copyright: org.copyright,
    wordmarks: [...face(mine.wordmark), ...face(org.wordmark)],
  };
}

// Most projects have no mark, and a fleet is a list of projects rather than a
// list of pictures, so a missing directory is an absence and not a failure.
function markOf(beside, slug) {
  let names = [];
  try {
    names = readdirSync(`${beside}${slug}`);
  } catch {
    return undefined;
  }
  const found = names.find((name) => name.replace(/\.[^.]+$/, "") === "logo");
  return found && `/assets/${slug}/${found}`;
}

function wordmarks() {
  const fonts = every("wordmark-font");
  const files = every("wordmark-woff2");
  return every("wordmark").map((text, index) => ({
    text,
    font: fonts[index],
    woff2: files[index],
  }));
}

const shared = registry();
const given = {
  siteUrl: option("site-url")?.replace(/\/$/, ""),
  name: option("name"),
  description: option("description"),
  github: option("github"),
  social: option("social"),
  staticDir: option("static"),
  license: option("license"),
  copyright: option("copyright"),
  wordmarks: wordmarks(),
  logo: option("logo"),
};

try {
  await build(contentDir, outDir, {
    ...shared,
    ...Object.fromEntries(
      Object.entries(given).filter(([, value]) =>
        Array.isArray(value) ? value.length : value !== undefined),
    ),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}
