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

const MARKER = "<!--projects-->";

function lists(node) {
  if (node.root?.body?.includes(MARKER) || node.body?.includes(MARKER)) return true;
  return (node.children ?? []).some(lists);
}

// The three pictures every site has are found by name in its static directory
// rather than recorded as paths somewhere else. A path into another repository
// is a thing to get wrong; a filename is a thing to follow.
async function conventional(options) {
  const where = [options.staticDir, options.assetsDir].filter(Boolean);
  if (!where.length) return options;
  const files = (await Promise.all(where.map((dir) => readdir(dir).catch(() => []))))
    .flat();
  const named = (stem) => {
    const found = files.find((name) => name.replace(/\.[^.]+$/, "") === stem);
    return found && `/${found}`;
  };
  return {
    ...options,
    logo: options.logo ?? named("favicon") ?? named("logo"),
    touchIcon: named("apple-touch-icon"),
    social: options.social ?? named("social"),
  };
}

export async function build(contentDir, outDir, settings) {
  const options = await conventional(settings);
  const tree = await readTree(path.resolve(contentDir));
  // Only a site that lists the fleet pays for it: the other projects' marks
  // and the faces their names are set in are fetched, declared and copied for
  // that page alone, and a site that never mentions them ships none of it.
  if (!lists(tree)) options.projects = [];
  const site = { ...options, name: options.name ?? title(tree) ?? "docs", tree };
  const theme = await readFile(new URL("../theme.css", import.meta.url), "utf8") +
    wordmarkFace(options);

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
  // The shared pictures first, so a site that keeps its own copy overwrites it.
  if (options.assetsDir) await cp(options.assetsDir, outDir, { recursive: true });
  // The faces this page sets names in -- its own, and every project it lists,
  // because a fleet where each name is in its own face needs each of them.
  // They ship with the generator so that a family resemblance does not mean the
  // same file committed once per repository.
  for (const mark of [...marks(options), ...(options.projects ?? [])]) {
    if (!mark.woff2 || !options.fontsDir) continue;
    const face = path.basename(mark.woff2);
    await cp(path.join(options.fontsDir, face), path.join(outDir, face))
      .catch(() => {});
  }
  // Marks only, for a page that lists the fleet: a logo is small and a cover
  // is not, and no site needs another site's cover.
  for (const project of options.projectsDir ? options.projects ?? [] : []) {
    if (!project.logo) continue;
    const to = path.join(outDir, project.logo.replace(/^\//, ""));
    await mkdir(path.dirname(to), { recursive: true });
    await cp(path.join(options.projectsDir, project.key, path.basename(project.logo)), to);
  }
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

// The landing is the site, so it says what the site says: its name at length
// if it has a longer one, its tagline, and the tab it asked for, all from the
// one place those are written. The short name still does the small jobs -- the
// index, the suffix on every other tab, the card -- because a masthead and a
// label are not the same word.
// A root index.md that states them anyway still wins, but it no longer has to.
function landing(section, site) {
  return {
    title: section.root?.frontmatter.title ?? site.fullName ?? site.name,
    tab: tab(section) ?? site.tabTitle,
    description: description(section) || site.description || "",
  };
}

async function emitSection(section, trail, site, outDir) {
  const here = section.slug ? [...trail, section] : trail;
  const segments = here.map((n) => n.slug);
  const root = !section.slug;
  const said = root ? landing(section, site) : {
    title: title(section),
    tab: tab(section),
    description: description(section),
  };

  const lede = root && said.description
    ? `<p class="lede">${escapeHtml(said.description)}</p>\n`
    : "";
  const body = lede + (section.root ? renderMarkdown(section.root.body) : "");
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
    title: said.title,
    tab: said.tab,
    description: said.description,
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

// The first crumb says Home rather than the site's name: a reader who wants
// the name has it above the index, and a trail reads as a path, not a title.
// Every page opens at the same height. Pages below the landing show a trail;
// the landing holds the same space open and shows nothing, so moving between
// them does not shift the title. Keying this off the trail instead meant a
// section index had no crumbs while the pages inside it did.
function breadcrumbs(trail, site, segments) {
  if (!segments.length) return `<div class="crumbs" aria-hidden="true"></div>`;
  let href = "";
  const parts = [{ label: "Home", href: "/" }];
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

const marks = (site) => (site.wordmarks ?? []).filter((mark) => mark.text);

// Each wordmark's face, declared in the stylesheet every page already fetches
// and served from wherever the site keeps it. Held rather than swapped: a face
// that arrives late should arrive, not flash the serif on its way in, and the
// preload below is what keeps that wait down to nothing worth seeing.
function wordmarkFace(options) {
  const declared = new Set();
  return marks(options)
    .map((mark, index) => {
      if (!mark.font) return "";
      // Several names can share one face; it is fetched and declared once.
      const face = mark.woff2 && !declared.has(mark.woff2)
        ? (declared.add(mark.woff2),
          `@font-face { font-family: ${mark.font}; font-style: normal;\n` +
          `  font-weight: 400; font-display: block;\n` +
          `  src: url("${mark.woff2}") format("woff2"); }\n`)
        : "";
      return `\n${face}.wordmark-${index + 1} { font-family: ${mark.font}, var(--font-body); }\n`;
    })
    .concat((options.projects ?? []).map((project) => {
      if (!project.font) return "";
      const face = project.woff2 && !declared.has(project.woff2)
        ? (declared.add(project.woff2),
          `@font-face { font-family: ${project.font}; font-style: normal;\n` +
          `  font-weight: 400; font-display: block;\n` +
          `  src: url("${project.woff2}") format("woff2"); }\n`)
        : "";
      return `\n${face}.mark-${project.key} { font-family: ${project.font}, var(--font-body); }\n`;
    }))
    .join("");
}

// Fonts are fetched in CORS mode whatever their origin, so a preload without
// crossorigin is a second download rather than a head start.
function fontLink(site) {
  const wanted = [...marks(site), ...(site.projects ?? [])];
  return [...new Set(wanted.map((mark) => mark.woff2).filter(Boolean))]
    .map((woff2) => `<link rel="preload" as="font" type="font/woff2" ` +
      `href="${escapeHtml(woff2)}" crossorigin>`)
    .join("\n");
}

// The wordmark is set in its own face wherever it appears in prose. The walk
// alternates tags and text, so a name inside an attribute or a URL is never
// rewritten, and code keeps the plain face a reader would type.
function wordmarked(html, site) {
  const wanted = marks(site);
  if (!wanted.length) return html;
  // Longest first, so a name containing another name wins the match it should.
  const order = [...wanted].sort((a, b) => b.text.length - a.text.length);
  // A name is written to fit the column it lives in, so the space between its
  // words may have been a line break by the time it is rendered.
  const flat = (text) => text.replace(/\s+/g, " ");
  const index = new Map(wanted.map((mark, at) => [flat(mark.text), at + 1]));
  const pattern = new RegExp(
    `\\b(?:${order
      .map((mark) => mark.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
      .join("|")})\\b`,
    "g",
  );
  let literal = 0;
  return html.replace(/<[^>]*>|[^<]+/g, (chunk) => {
    if (!chunk.startsWith("<"))
      return literal
        ? chunk
        : chunk.replace(pattern, (word) =>
            `<span class="wordmark wordmark-${index.get(flat(word))}">${word}</span>`);
    if (/^<(code|pre|script|style)[\s>]/i.test(chunk)) literal++;
    else if (/^<\/(code|pre|script|style)>/i.test(chunk)) literal = Math.max(0, literal - 1);
    return chunk;
  });
}

// What a link to this page looks like when it is pasted somewhere else. The
// card is per page rather than per site, because a link to one guide should
// say which guide. The image is the site's, and has to be absolute: whoever
// unfurls it is not resolving paths against this origin.
function sharing(site, segments, title, description) {
  if (!site.social || !site.siteUrl) return "";
  const image = /^https?:\/\//.test(site.social) ? site.social : site.siteUrl + site.social;
  const tags = [
    ["og:type", "website"],
    ["og:site_name", site.name],
    ["og:title", title],
    ["og:description", description],
    ["og:url", site.siteUrl + url(segments)],
    ["og:image", image],
  ];
  return tags
    .filter(([, value]) => value)
    .map(([property, value]) =>
      `<meta property="${property}" content="${escapeHtml(String(value))}">`)
    .concat('<meta name="twitter:card" content="summary_large_image">')
    .join("\n");
}

// A page that says <!--projects--> gets the fleet, from the same registry the
// sites build themselves out of. The marker is an HTML comment so a generator
// that does not know it leaves an empty line rather than a broken page.
function fleet(html, site) {
  if (!html.includes(MARKER)) return html;
  const rows = (site.projects ?? []).map((project) => {
    // The gutter is held open whether or not there is a mark to put in it, so
    // a fleet where only some projects have one still reads as a list.
    const mark = project.logo
      ? `<img class="fleet-mark" src="${escapeHtml(project.logo)}" alt="">`
      : `<span class="fleet-mark"></span>`;
    // The name is the link to the thing itself, so the only line left to add
    // is where the code is. Two links under a name that is already a link is
    // three ways to say the same place.
    const where = project.url || project.repo;
    const links = project.repo
      ? `<a href="${escapeHtml(project.repo)}">Code</a>`
      : "";
    const named = project.font
      ? `<span class="wordmark mark-${project.key}">${escapeHtml(project.name)}</span>`
      : escapeHtml(project.name);
    return `<li>${mark}<div><a class="fleet-name" href="${escapeHtml(where)}">` +
      `${named}</a>` +
      (project.tagline ? `<span class="dim">${escapeHtml(project.tagline)}</span>` : "") +
      (links ? `<span class="dim">${links}</span>` : "") +
      `</div></li>`;
  });
  return html.replace(MARKER, rows.length ? `<ul class="fleet">${rows.join("")}</ul>` : "");
}

function pageShell({ site, segments, title: pageTitle, tab, description, trail, body }) {
  const canonical = site.siteUrl
    ? `<link rel="canonical" href="${escapeHtml(site.siteUrl + url(segments))}">`
    : "";
  const social = sharing(site, segments, tab ?? pageTitle, description);
  const alone = !site.tree.children.length;
  const nav = alone ? "" : treeNav(site.tree, segments, site);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(tab ?? pageTitle)}${!tab && segments.length ? ` — ${escapeHtml(site.name)}` : ""}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
${site.logo ? `<link rel="icon" href="${escapeHtml(site.logo)}">` : ""}
${site.touchIcon ? `<link rel="apple-touch-icon" href="${escapeHtml(site.touchIcon)}">` : ""}
${canonical}
${social}
${fontLink(site)}
<link rel="stylesheet" href="${"./".repeat(segments.length)}theme.css">
</head>
<body>
<div class="wrap${alone ? " solo" : ""}">
${nav ? `<div>
<p class="brand"><a href="/">${segments.length ? "" : mark(site)}<strong>${wordmarked(escapeHtml(site.name), site)}</strong></a></p>
${nav}
</div>` : ""}
<main>
${breadcrumbs(trail, site, segments)}
${fleet(wordmarked(body, site), site)}
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
