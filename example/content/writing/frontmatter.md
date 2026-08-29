---
title: Frontmatter
description: Four keys, and what each one is for.
tab-title: Frontmatter — the four keys
order: 1
---

Four keys, read from the block between the two `---` lines at the top of a
page. Anything else there is carried into the page's markdown twin and
otherwise ignored.

| key | what it does |
| --- | --- |
| `title` | the heading, the sidebar entry, the tab |
| `description` | the meta description, and the line on the section index |
| `order` | lower sorts first within its section; unset sorts last, alphabetically |
| `tab-title` | a tab that should not read like the heading |

## title and description

Both are required on every page but the landing, which is the site rather than
a page in it. The description is not decoration: it is the one line a reader
sees on the index above this page, and the one line a search result shows.

## order

A section's own order lives on its `index.md`, which is how *Writing* sits
second and *The theme* third. Within a section, pages sort by `order` and then
by title, so a half-ordered section still lands somewhere sensible.

## tab-title

This page sets one. The heading above says **Frontmatter**; the browser tab
says *Frontmatter — the four keys*, and the site name is not appended, because
a tab-title is the whole title.

> A page that needs its tab to differ from its heading usually has a heading
> that is right in place and wrong out of it. The tab is the out-of-place one.
