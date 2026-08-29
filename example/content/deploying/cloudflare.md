---
title: A Worker over the files
description: wrangler.toml, the asset directory, and dev previews.
order: 1
---

Two files beside the content: a `wrangler.toml` naming the output directory,
and a `worker.ts` doing the one job assets alone cannot.

```toml
name = "powderworks-docs-example"
main = "worker.ts"
compatibility_date = "2026-07-01"

[assets]
directory = "./out"
not_found_handling = "404-page"
binding = "ASSETS"

run_worker_first = true
```

`not_found_handling` points at the `404.html` the generator writes.
`run_worker_first` is on because the worker has something to say about any
path, which the next page explains.

## Previewing

```sh
bun run dev        # localhost:8787, rebuilt from the markdown
bun run preview    # uploads a version and prints its preview URL
bun run deploy     # the real thing
```

`bun run preview` is `wrangler versions upload`: it puts the build on
Cloudflare and hands back a URL nobody else is routed to, which is the one to
paste into a pull request. `deploy` promotes a build to whatever route the
Worker holds.

## Building it in Cloudflare instead

Workers Builds runs the same two scripts: root directory `example`, build
command `bun run build`, deploy command `bun run deploy`. Both go through
`package.json` so that `wrangler` comes from the lockfile, where `npx wrangler`
would fetch whatever is newest on the day of the deploy.
