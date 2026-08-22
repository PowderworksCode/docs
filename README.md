# Powderworks docs

`@thepowderworks/fumadocs` — the shared Fumadocs foundation for Powderworks
project sites: configuration helpers, locale-aware layout options, providers,
search plumbing, MDX components, and persistent programming-language tabs.

It is installed directly from this repository; the first consumer is
[straitjacket.dev](https://straitjacket.dev), with ordnung's site to follow.
Visual identity stays with each project — this package ships no styles.

## Development

```sh
bun install
bun run build
bun run typecheck
```

## Consumer setup

The package exports focused entrypoints so a Next.js site can keep server and
client boundaries obvious:

- `config` — typed site metadata and locale-aware URL helpers
- `i18n` — Fumadocs locale configuration with static-export-safe prefixes
- `layout` — fleet navigation and base layout options
- `provider` and `search` — client-side Fumadocs plumbing
- `mdx` — standard components and persistent `LanguageTabs`

A consumer imports its own styling alongside the Fumadocs preset:

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
```
