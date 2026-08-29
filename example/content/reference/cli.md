---
title: The build command
description: Every flag, and which of them the registry can answer for you.
order: 1
---

```sh
powderworks-docs build <contentDir> --out <outDir> [options]
```

| flag | what it does |
| --- | --- |
| `--site <key>` | take everything below from `powderworks.toml` |
| `--config <path>` | read that file from somewhere else |
| `--site-url <url>` | canonical origin, for `rel=canonical` and the sitemap |
| `--name <name>` | site name; defaults to the landing's first heading |
| `--description <text>` | meta description for the root page |
| `--github <owner/repo>` | the repository link in the footer |
| `--logo <path>` | the mark beside the name, and the favicon |
| `--social <path>` | the card a link to this site shows when unfurled |
| `--static <dir>` | a directory copied verbatim into the output |
| `--license <text>` | the footer's licence line |
| `--copyright <name>` | a footer copyright, replacing the licence line |
| `--wordmark <text>` | set this word in its own face wherever it appears |
| `--wordmark-font <family>` | the CSS family for it |
| `--wordmark-woff2 <url>` | the woff2 for it, served by this site |

Anything given on the command line wins over the registry, so a site can name
itself and then differ on one thing.

## Found by name, not by flag

Three pictures are found in the static directory rather than named: `logo.*`
beside the site name and in the tab, `cover.*` as the picture the landing opens
with, and `social.*` as the card. A path into another directory is a thing to
get wrong; a filename is a thing to follow.

This example's `public/` holds a `logo.svg` and a `cover.svg` and no social
card, which is why a link to it unfurls with words alone.
