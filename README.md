# powderworks-docs

Turns a tree of markdown into a tree of indexes. One small script, to copy a code block; nothing else runs in the browser.

Every directory is a section; every section gets an index page listing its
children — title and one-line description from frontmatter. Breadcrumbs come
from the path you already have. The whole aesthetic is [cratebank.io](https://cratebank.io):
system serif, six color tokens, automatic light and dark, one readable column.

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

## Serving

The output is plain files; anything that serves static assets works. On
Cloudflare Workers, point `[assets]` at the output directory and set
`not_found_handling = "404-page"`.
