This is the demonstration site for **powderworks-docs**: one small tree of
markdown, built by the generator in this repository, carrying every feature it
has. Read it in a browser to see the theme; read the source beside it to see
what produced each page.

## Build it

```sh
cd example
bun install          # wrangler, for the preview and the deploy
bun run build        # writes example/out
bun run dev          # serves it at localhost:8787
```

`bun run build` calls the generator from `../src`, so a change to the
generator shows up here on the next build, with nothing to publish first.

## What is here

Five sections, deliberately shallow, each one an index of the pages below it.
The index on the left is the whole tree; on a phone it folds behind the button
beside the name.

| section | what it shows |
| --- | --- |
| Getting started | the smallest content tree that builds |
| Writing | frontmatter, and what markdown turns into |
| The theme | typography, navigation, light and dark |
| Deploying | a Worker, an asset directory, a preview URL |
| Reference | every flag, and the registry behind them |

## The workshop

The fleet below is not written into this page. It is the registry that ships
with the generator, minus this site, rendered where the page says
`<!--projects-->`:

<!--projects-->
