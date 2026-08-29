---
title: The markdown twin
description: Every page, in the form an agent would rather read.
order: 2
---

Every rendered page has its source beside it: `/writing/frontmatter/index.html`
and `/writing/frontmatter/index.md`. The worker serves the second to anything
that asks for it by name:

```sh
curl -H 'Accept: text/markdown' https://example.powderworks.dev/writing/frontmatter/
```

Browsers never send that, so a reader gets the HTML untouched; an agent asking
for markdown is handed the markdown, with `Vary: Accept` so nothing caches one
as the other. Where a page has no twin the worker steps aside and the asset is
served as it was.

`llms.txt` at the root lists every page with its description, so a crawler that
wants the whole tree can take it in one request rather than thirteen.
