# Powderworks docs

The shared Fumadocs foundation for Powderworks projects. It provides the fleet's reading system,
multilingual plumbing, persistent programming-language tabs, and a theme designed to be extended
by each project rather than copied and modified.

## Packages

- `@thepowderworks/fumadocs` — configuration helpers, locale-aware layout options, providers,
  search, MDX components, and the shared CSS theme.

The first local consumer lives at `../ordnung/site` and currently uses a file dependency. The
package is structured for publication once its API has been proven by more than one site.

## Development

```sh
bun install
bun run build
bun run typecheck
```

Projects import the shared theme and override the documented `--pw-project-*` variables in their
own `global.css`. Product content, route entrypoints, and source configuration remain local.

## Consumer setup

The package exports focused entrypoints so a Next.js site can keep server and client boundaries
obvious:

- `config` — typed site metadata and locale-aware URL helpers
- `i18n` — Fumadocs locale configuration with static-export-safe prefixes
- `layout` — fleet navigation and base layout options
- `provider` and `search` — client-side Fumadocs plumbing
- `mdx` — standard components and persistent `LanguageTabs`
- `theme.css` — shared tokens and reading styles

A consumer imports Tailwind and the Fumadocs preset before the package theme:

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
@import "@thepowderworks/fumadocs/theme.css";
```

Then it may provide light and dark values for `--pw-project-accent`,
`--pw-project-accent-strong`, `--pw-project-wash`, and `--pw-project-rule`.

## Diátaxis content contract

Every substantive documentation page declares one reader need in its frontmatter:

```mdx
---
title: Inspect your first repository
mode: tutorial
---
```

The supported modes and default sections are:

| `mode` | Default section | Reader need |
| --- | --- | --- |
| `tutorial` | `tutorials` | Learn through a guided experience |
| `how-to` | `how-to-guides` | Accomplish a specific task |
| `reference` | `reference` | Look up accurate product details |
| `explanation` | `explanation` | Understand reasons and relationships |

Run the checker from a consumer site:

```sh
powderworks-docs check content/docs
```

While consuming the package through a local `file:` dependency, Bun may not link package binaries.
In that case, invoke `node node_modules/@thepowderworks/fumadocs/dist/cli.js check content/docs`.

Guidance is non-blocking by default. Add `--strict` when a repository is ready to enforce the
contract. For locale-suffixed Fumadocs pages, `--locales en,de,fr` also reports translation gaps;
pages without a locale suffix are treated as shared content.
