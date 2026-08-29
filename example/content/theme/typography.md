---
title: Type and colour
description: A system serif, six tokens, and a name set in its own face.
order: 2
---

## The face

`ui-serif` with Georgia behind it: a face every machine already has, so the
first paint is the final one and nothing shifts when a webfont lands. Code is
`ui-monospace` on the same terms.

## Six tokens

Every literal colour in the stylesheet is one of six custom properties — ink,
dim ink, page, rule, code panel, link — so a change lands in one place and both
schemes stay in step.

## A name in its own face

A site may set its own name in a display face, and that one word is then set in
it wherever it appears: in the index, in the heading, and mid-sentence, like
Straitjacket in the fleet on the landing. The face is declared in the
stylesheet the page already fetches and the file ships with the generator, so a
family resemblance does not mean the same woff2 committed once per repository.

Display faces run small against a serif at the same size, so a wordmark is
nudged up a little to sit level with the words either side, and its weight is
pinned, because a one-weight face gets smeared by a bold heading.
