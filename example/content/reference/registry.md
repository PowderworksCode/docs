---
title: The registry
description: One file for the names every site shares and the ones each varies.
order: 2
---

`powderworks.toml` ships with the generator. The `[org]` half is what the sites
have in common; a `[site.<key>]` block is what one site varies. A site names
itself with `--site` and gets the rest.

```toml
[site.example]
published = false
name = "Example"
tagline = "Everything this generator does, on one small tree."
hero = true
url = "https://example.powderworks.dev"
github = "PowderworksCode/docs"
tab-title = "Example by Powderworks"
```

`published` says whether a project is shown to readers, which is not the same
question as whether its repository is public. This site sets it false: it is a
demonstration, not a project, so it never appears in another site's fleet —
while every published site appears in the one on this site's landing.

`hero` sets the landing's opening beside the cover rather than above it, on one
baseline grid, so the name, the line under it and the picture read as one
block.

## Why a file rather than four package.json files

Repositories reference each other often enough that the alternative is the same
string written into four places and wrong in one of them. Adding a site means
an entry here, which is the trade: one place to change a name, one repository
to open a pull request against.
