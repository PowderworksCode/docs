// The whole generator: a directory walk, a tiny frontmatter reader, and one
// page template. Deliberately boring.
//
//   content/
//     index.md              -> /
//     getting-started.md    -> /getting-started/
//     guides/index.md       -> /guides/          (section index)
//     guides/ci.md          -> /guides/ci/

import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const MARKDOWN = /\.(?:md|markdown)$/;

// Every heading below the page title links to itself, so a section can be sent
// to someone directly. The mark is invisible until the heading is hovered or
// the link takes focus, and it holds its space either way, so nothing shifts.
marked.use({
  renderer: {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      const id = headingId(text);
      return `<h${token.depth} id="${id}">${text}` +
        `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>` +
        `</h${token.depth}>\n`;
    },
  },
});

const headingIds = new Set();
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

function headingId(html) {
  const base = html
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ENTITIES[name])
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-") || "section";
  let id = base;
  for (let n = 2; headingIds.has(id); n++) id = `${base}-${n}`;
  headingIds.add(id);
  return id;
}

// Ids need to be unique within a page, not across the site, so the set of
// those taken resets with each page rendered.
function renderMarkdown(text) {
  headingIds.clear();
  return marked.parse(text);
}

export async function build(contentDir, outDir, options) {
  const tree = await readTree(path.resolve(contentDir));
  const site = { ...options, name: options.name ?? title(tree) ?? "docs", tree };
  const theme = await readFile(new URL("../theme.css", import.meta.url), "utf8");

  // Pages reference ./theme.css, so every emitted directory carries a copy.
  for (const { segments } of walkPaths(tree, [])) {
    const dir = path.join(outDir, ...segments);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "theme.css"), theme);
  }

  await emitSection(tree, [], site, outDir);
  await writeSitemap(tree, site, outDir);
  await writeLlmsTxt(tree, site, outDir);
  await writeNotFound(site, outDir);
  if (options.staticDir) await cp(options.staticDir, outDir, { recursive: true });
}

// Markdown sources travel beside their rendered page, so agents can fetch
// either form without negotiation.
function sourceText(pageOrSection) {
  const root = pageOrSection.root ?? pageOrSection;
  if (!root.body) return null;
  const lines = Object.entries(root.frontmatter ?? {}).map(
    ([key, value]) => `${key}: ${value}`,
  );
  return lines.length
    ? `---\n${lines.join("\n")}\n---\n\n${root.body}`
    : root.body;
}

// --- reading -----------------------------------------------------------------

async function readTree(dir) {
  const node = { dir, children: [] };

  for (const entry of (await readdir(dir, { withFileTypes: true })).sort(byName)) {
    if (entry.name.startsWith(".")) continue;
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const child = await readTree(file);
      if (child.root || child.children.length) {
        // A section's order lives on its index page's frontmatter.
        if (child.root?.frontmatter?.order !== undefined)
          child.order = Number(child.root.frontmatter.order);
        node.children.push({ ...child, slug: entry.name });
      }
    } else if (MARKDOWN.test(entry.name)) {
      const { frontmatter, body } = splitFrontmatter(await readFile(file, "utf8"));
      const page = { file, slug: entry.name.replace(MARKDOWN, ""), frontmatter, body };
      if (page.slug === "index") node.root = page;
      else node.children.push(page);
    }
  }

  const rank = (item) => Number(item.frontmatter?.order ?? item.order ?? 1 << 30);
  node.children.sort(
    (a, b) => rank(a) - rank(b) || String(title(a)).localeCompare(String(title(b))),
  );
  return node;
}

const byName = (a, b) => a.name.localeCompare(b.name);

function splitFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-z][a-z-]*):\s*(.*)$/.exec(line.trim());
    if (pair) frontmatter[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: source.slice(match[0].length) };
}

// A node is a page ({file}) or a section ({dir}). A section without an index
// page takes its name from its directory.
const title = (node) =>
  node.root?.frontmatter.title ?? node.frontmatter?.title ?? sentence(node.slug);
const description = (node) =>
  node.root?.frontmatter.description ?? node.frontmatter?.description ?? "";
// A page whose tab should not read like its heading says so itself. Given, it
// is the whole title: no site name appended, because the point of saying it is
// to say the whole thing.
const tab = (node) =>
  node.root?.frontmatter["tab-title"] ?? node.frontmatter?.["tab-title"];

const sentence = (slug) =>
  String(slug).replaceAll("-", " ").replace(/^\w/, (c) => c.toUpperCase());

// --- emitting ----------------------------------------------------------------

async function emitSection(section, trail, site, outDir) {
  const here = section.slug ? [...trail, section] : trail;
  const segments = here.map((n) => n.slug);

  const body = section.root ? renderMarkdown(section.root.body) : "";
  const listing = section.slug && section.children.length
    ? `<ul class="index">\n${section.children.map((child) =>
        `<li><a href="${child.slug}/">${escapeHtml(title(child))}</a>` +
        (description(child)
          ? `\n<span class="dim">${escapeHtml(description(child))}</span>`
          : "") +
        `</li>`,
      ).join("\n")}\n</ul>`
    : "";

  await writePage({
    outDir,
    segments,
    title: title(section),
    tab: tab(section),
    description: description(section),
    body: `${body}${listing}`,
    trail: here.slice(0, -1),
    site,
  });
  const source = sourceText(section);
  if (source)
    await writeFile(path.join(outDir, ...segments, "index.md"), source);

  for (const child of section.children) {
    if (child.file) await emitPage(child, here, site, outDir);
    else await emitSection(child, here, site, outDir);
  }
}

async function emitPage(page, trail, site, outDir) {
  const segments = [...trail.map((n) => n.slug), page.slug];
  await writePage({
    outDir,
    segments,
    title: page.frontmatter.title ?? sentence(page.slug),
    tab: tab(page),
    description: page.frontmatter.description ?? "",
    body: renderMarkdown(page.body),
    trail,
    site,
  });
  const source = sourceText(page);
  if (source) await writeFile(path.join(outDir, ...segments, "index.md"), source);
}

// The site mark travels: it sits beside the entry you are reading rather than
// staying put at the top, so the index says where you are twice over. Every
// link reserves the gutter it lands in, so nothing shifts as it moves.
function mark(site) {
  return site.logo
    ? `<img class="tree-mark" src="${escapeHtml(site.logo)}" alt="">`
    : "";
}

// The persistent index list: the whole tree as nested links, with the page
// you are on marked. Pure markup — the highlight is baked in at build time.
function treeNav(tree, current, site) {
  const currentPath = url(current);
  const render = (node, segments) => {
    const here = [...segments, node.slug];
    const path = url(here);
    const reading = path === currentPath;
    const active = reading ? ' class="current"' : "";
    const label = (reading ? mark(site) : "") + escapeHtml(title(node));
    if (node.file) return `<li><a href="${path}"${active}>${label}</a></li>`;
    const kids = node.children.map((child) => render(child, here)).join("");
    return (
      `<li class="group"><a href="${path}"${active}>${label}</a>` +
      (kids ? `<ul>${kids}</ul>` : "") +
      `</li>`
    );
  };
  const items = tree.children.map((child) => render(child, [])).join("");
  return `<nav class="tree" aria-label="Pages"><ul>${items}</ul></nav>`;
}

function* walkPaths(node, base) {
  const here = node.slug ? [...base, node.slug] : base;
  yield { segments: here, node };
  for (const child of node.children ?? []) yield* walkPaths(child, here);
}

const url = (segments) => "/" + segments.join("/") + (segments.length ? "/" : "");

async function writeSitemap(tree, site, outDir) {
  if (!site.siteUrl) return;
  const rows = [...walkPaths(tree, [])]
    .map(({ segments }) =>
      `  <url><loc>${escapeHtml(site.siteUrl + url(segments))}</loc></url>`,
    )
    .join("\n");
  await writeFile(
    path.join(outDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`,
  );
}

async function writeLlmsTxt(tree, site, outDir) {
  const lines = [`# ${site.name}`, ""];
  if (site.description) lines.push(`> ${site.description}`, "");
  if (site.github)
    lines.push(`Source: https://github.com/${String(site.github).replace(/^https?:\/\/github\.com\//, "")}`, "");
  for (const { segments, node } of walkPaths(tree, [])) {
    if (!segments.length) continue;
    lines.push(`- [${title(node)}](${url(segments)})`);
  }
  await writeFile(path.join(outDir, "llms.txt"), lines.join("\n") + "\n");
}

async function writeNotFound(site, outDir) {
  const html = pageShell({
    site,
    segments: [],
    title: "Page not found",
    description: "",
    trail: [],
    body:
      `<p>There is nothing at this address.</p>` +
      `<p><a href="/">Back to the start</a>.</p>`,
  });
  await writeFile(path.join(outDir, "404.html"), html);
}

// --- page shell -----------------------------------------------------------------

// Every page opens at the same height. Pages below the landing show a trail;
// the landing holds the same space open and shows nothing, so moving between
// them does not shift the title. Keying this off the trail instead meant a
// section index had no crumbs while the pages inside it did.
function breadcrumbs(trail, site, segments) {
  if (!segments.length) return `<div class="crumbs" aria-hidden="true"></div>`;
  let href = "";
  const parts = [{ label: escapeHtml(site.name), href: "/" }];
  for (const node of trail) {
    href += `/${node.slug}`;
    parts.push({ label: escapeHtml(title(node)), href: `${href}/` });
  }
  return (
    `<nav class="crumbs">` +
    parts.map((part) => `<a href="${part.href}">${part.label}</a>`).join('<span class="dim"> / </span>') +
    `</nav>`
  );
}

// A copyright line answers the whole question a footer is asked, so given one
// it stands alone rather than joining the source link and the licence.
function footer(site) {
  if (site.copyright)
    return `<footer>&copy; ${new Date().getFullYear()} ${escapeHtml(site.copyright)}</footer>`;
  const bits = [];
  if (site.github)
    bits.push(
      `<a href="https://github.com/${String(site.github).replace(/^https?:\/\/github\.com\//, "")}">Source</a>`,
    );
  if (site.license) bits.push(escapeHtml(site.license));
  return `<footer>${bits.join(" · ")}</footer>`;
}

// Pages in sidebar order, for the previous/next links at the foot of each
// page. Sections count only when they carry their own index page.
function flatPages(tree) {
  if (!tree.flat) {
    tree.flat = [...walkPaths(tree, [])]
      .filter(({ node }) => node.file || node.root)
      .map(({ segments, node }) => ({ path: url(segments), title: title(node) }));
  }
  return tree.flat;
}

function pager(tree, segments) {
  const pages = flatPages(tree);
  const index = pages.findIndex((page) => page.path === url(segments));
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next = index !== -1 && index < pages.length - 1 ? pages[index + 1] : undefined;
  if (!previous && !next) return "";
  const side = (page, arrow, align) =>
    page
      ? `<a href="${page.path}" class="${align}">${arrow} ${escapeHtml(page.title)}</a>`
      : "<span></span>";
  return (
    `<nav class="pager">` +
    side(previous, "\u2190", "prev") +
    side(next, "\u2192", "next") +
    `</nav>`
  );
}

// The one script this generator emits. It adds a copy button to each code
// block, and it builds the buttons rather than shipping them in the markup, so
// a reader without JavaScript is never offered a button that cannot work. The
// mark is a clipboard rather than the word, and it stays visible rather than
// waiting for a hover, because a button nobody can see is one nobody uses.
const COPY_SCRIPT = `<script>
const svg = (body, width) =>
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="' +
  width + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
const CLIPBOARD = svg('<rect x="6" y="6" width="8.5" height="9" rx="1.5"/>' +
  '<path d="M10.5 6V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12H6"/>', "1.4");
const TICK = svg('<path d="M3.5 8.5 6.5 11.5 12.5 5"/>', "1.75");

if (navigator.clipboard) {
  for (const pre of document.querySelectorAll("main pre")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    const mark = (icon, label) => {
      button.innerHTML = icon;
      button.setAttribute("aria-label", label);
      button.title = label;
    };
    mark(CLIPBOARD, "Copy");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText((pre.querySelector("code") || pre).textContent);
        mark(TICK, "Copied");
      } catch {
        mark(CLIPBOARD, "Copy failed");
      }
      setTimeout(() => mark(CLIPBOARD, "Copy"), 1500);
    });
    const holder = document.createElement("div");
    holder.className = "codeblock";
    pre.replaceWith(holder);
    holder.append(pre, button);
  }
}
</scr` + `ipt>`;

function pageShell({ site, segments, title: pageTitle, tab, description, trail, body }) {
  const canonical = site.siteUrl
    ? `<link rel="canonical" href="${escapeHtml(site.siteUrl + url(segments))}">`
    : "";
  const nav = treeNav(site.tree, segments, site);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(tab ?? pageTitle)}${!tab && segments.length ? ` — ${escapeHtml(site.name)}` : ""}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
${site.logo ? `<link rel="icon" href="${escapeHtml(site.logo)}">` : ""}
${canonical}
<link rel="stylesheet" href="${"./".repeat(segments.length)}theme.css">
</head>
<body>
<div class="wrap">
${nav ? `<div>
<p class="brand"><a href="/">${segments.length ? "" : mark(site)}<strong>${escapeHtml(site.name)}</strong></a></p>
${nav}
</div>` : ""}
<main>
${breadcrumbs(trail, site, segments)}
${body}
${segments.length ? pager(site.tree, segments) : ""}
${footer(site)}
</main>
</div>
${COPY_SCRIPT}
</body>
</html>
`;
}

async function writePage({ outDir, title: pageTitle, ...context }) {
  context.body = `<h1>${escapeHtml(pageTitle)}</h1>\n` + context.body;
  const target = path.join(outDir, ...context.segments, "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, pageShell({ ...context, title: pageTitle }));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
