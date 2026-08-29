---
title: Getting started
description: The smallest content tree that builds, and what it produces.
order: 1
---

A site is a directory of markdown. Every directory is a section, every section
gets an index page listing its children, and the path you already have becomes
the breadcrumbs.

## The smallest tree

```text
content/
  index.md               → /
  getting-started.md     → /getting-started/
```

`index.md` is the landing. It needs no frontmatter: the name and the line under
it come from the registry, so the page does not repeat what the site already
says about itself. Every other page wants two lines of frontmatter, because
they become the browser tab, the meta description, and the entry on the section
index above it:

```markdown
---
title: Getting started
description: The smallest content tree that builds, and what it produces.
order: 1
---
```

## What a build writes

```sh
powderworks-docs build content --out out --site example --static public
```

Every page becomes a directory with an `index.html`, so URLs end in a slash and
nothing needs a rewrite rule. Beside each one is an `index.md` — the source,
served to anything that asks for markdown instead of HTML.

Alongside the pages: `sitemap.xml`, `llms.txt`, `404.html`, and a copy of
`theme.css` wherever a page references it.
