# powderworks-docs

Turns a tree of markdown into a tree of indexes. One small script to copy a code block, another to open the index on a narrow screen; nothing else runs in the browser.

Every directory is a section; every section gets an index page listing its
children — title and one-line description from frontmatter. Breadcrumbs come
from the path you already have. The whole aesthetic is [cratebank.io](https://cratebank.io):
system serif, six color tokens, automatic light and dark, one readable column.

## One place for the names

`powderworks.toml` ships with the generator and holds what the sites share and
what each one varies: the workshop's name and face under `[org]`, a site's own
name, tagline, domain, logo and face under `[site.<key>]`. A site names itself
and gets the rest.

```sh
powderworks-docs build content --out out --site straitjacket --static public
python3 node_modules/powderworks-docs/tools/social-card.py --site straitjacket
```

Anything passed on the command line still wins, and `--config` points at a
different file. Adding a site means an entry here, which is the trade: one
place to change a name, one repository to open a pull request against.

Pictures live in `assets/<key>/` here, not in the sites, because the workshop's
own pages show each project's mark and should not have to clone a repository to
find one. The generator copies them into the output, and a site that keeps its
own copy under the same name overwrites it.

| file | what it is |
| --- | --- |
| `assets/<key>/logo.*` | the mark, beside the site name and in the tab |
| `assets/<key>/cover.*` | the picture the landing opens with, and the card carries |
| `social.png` | the card itself, drawn into the site's static directory |

The landing takes its name, tagline and tab from `[site.<key>]` too. A root
`index.md` need carry no frontmatter at all; the tagline is set beneath the
title as the lede.

`--check` compares the committed card against what the config now says. It
compares the inputs rather than the pixels — the words, the picture, the face
and this script, hashed into the PNG when it is drawn — because freetype hints
differently from one version to the next and a card drawn on a laptop would
never match one redrawn on a runner.

## Usage

```sh
powderworks-docs build <contentDir> --out <outDir> \
  --site-url https://straitjacket.dev \
  --name Straitjacket \
  --description "A secret scanner, but for slop." \
  --github PowderworksCode/straitjacket \
  --license MIT \
  --wordmark Straitjacket \
  --wordmark-font '"Manufacturing Consent"' \
  --wordmark-woff2 /manufacturing-consent-latin.woff2 \
  --wordmark Powderworks \
  --wordmark-font '"IM Fell English SC"' \
  --wordmark-woff2 /im-fell-english-sc-latin.woff2 \
  --static ./public
```

## Content shape

```text
content/
  index.md               → /                (landing)
  getting-started.md     → /getting-started/
  guides/
    index.md             → /guides/         (section index)
    ci.md                → /guides/ci/
```

Frontmatter keys: `title`, `description`, `order` (lower sorts first within
its section), and `tab-title` for a browser tab that should not read like the
heading — given, it is the whole title, with no site name appended.

Each page also emits its markdown source as `index.md` beside its rendered
HTML, so agents can fetch either form without content negotiation.

Emitted alongside the pages: `sitemap.xml`, `llms.txt`, `404.html`, and
`theme.css` wherever a page references it.

## Values that move

A page that quotes the release it documents goes stale the day after it is
written. `--var name=value` fills `{{name}}` in wherever it appears — body,
frontmatter, and the markdown twin alike — so the site names the version and
the page never does:

```sh
powderworks-docs build content --out out --site straitjacket \
  --var version="$(sed -n 's/^version = "\(.*\)"$/\1/p' ../Cargo.toml | head -n 1)"
```

```markdown
- uses: PowderworksCode/straitjacket@v{{version}}
```

A name is lowercase letters, digits and dashes, and a `{{name}}` with no
`--var` behind it fails the build rather than shipping its braces to a reader.
A `$` in front is left alone, so a workflow example's `${{ github.token }}`
passes through untouched.

## The card a link shows

`--social` names the image; `tools/social-card.py` draws one to the same bones
for every site — the name in the site's own face, its tagline, its domain, its
logo down the right. Needs Pillow, and a `ttf` or `otf` rather than the `woff2`
the site serves, because Pillow cannot read `woff2`. A URL is fetched once.

```sh
python3 node_modules/powderworks-docs/tools/social-card.py \
  --name Straitjacket \
  --tagline "A secret scanner, but for slop." \
  --url straitjacket.dev \
  --logo public/engraving.jpg \
  --font https://raw.githubusercontent.com/google/fonts/main/ofl/x/X.ttf \
  --out public/social.png
```

A long name wraps rather than shrinking past the point where it would read
smaller than its own tagline. Without a logo the text simply has the width.

## The index on a narrow screen

The index is the sidebar on a wide screen and a button on a narrow one: the
name on one side of the head of the page, the button on the other, and the
whole tree — sub-lists included — beneath them when it is asked for. It pushes
the page down rather than covering it, so there is no overlay to trap, dim or
lock, and the button is a button, which is what a screen reader and a keyboard
already know how to work.

The button is only shown once the page has said, in a line in its head, that
scripts run here. Where they do not, the index sits above the words as it
always has, top level only, and nobody is handed a control that cannot open
anything.

## A site with nothing to index

A content tree with no pages below the landing gets no sidebar and a single
centred column. There is no flag: a site with one page has no index to show.

Such a page can say `<!--projects-->` and be handed the fleet — every other
site in the registry, with its tagline, its links and the mark that ships from
`assets/<key>/`. The marks are copied into the output; covers are not, because
no site needs another site's cover.

## The example site

`example/` is this generator pointed at a small tree that uses everything it
has: a hero and a cover, sections and section indexes, ordered frontmatter and
a tab-title, code blocks, tables, quotes, the fleet, the markdown twins, and
the index that folds behind a button on a phone. It builds from `../src`
rather than from a published copy, so a change to the generator shows up on the
next build with nothing to publish first.

```sh
cd example
bun install
bun run build      # writes example/out
bun run dev        # serves it at localhost:8787, worker and all
bun run preview    # uploads a version and prints its preview URL
bun run deploy     # promotes a build to the Worker's route
```

`bun run preview` is `wrangler versions upload`: a URL nobody else is routed
to, which is the one to paste into a pull request. Workers Builds settings are
root directory `example`, build `bun run build`, deploy `bun run deploy`.

`build` runs `bun install` at the repository root before it runs the
generator, because it runs the generator from `../src` and a build that starts
in `example` installs only what `example` declares — which is wrangler, and not
the two packages the generator itself imports.

The demonstration is also the selfcheck: `bun run selfcheck` at the root builds
the same tree and throws away the output, which is enough to catch a generator
change that stops producing pages at all.

## Serving

The output is plain files; anything that serves static assets works. On
Cloudflare Workers, point `[assets]` at the output directory and set
`not_found_handling = "404-page"`.
