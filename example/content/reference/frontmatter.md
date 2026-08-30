---
title: Frontmatter
description: "What a page may declare: title, description, order, and how they travel."
order: 9
---

Every page may open with a YAML block. `title` and `description` are what the
rendered page and its `<head>` use; `order` places the page among its siblings.

The Markdown source travels beside the rendered page, so an agent can fetch
either form. That copy carries this same block, which is why a value containing
a colon is emitted quoted — written plain, `description` above would parse as a
nested mapping and the emitted file would stop being YAML.
