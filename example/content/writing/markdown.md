---
title: What markdown becomes
description: Headings, code, tables, quotes and pictures, as the theme sets them.
order: 2
---

Standard markdown, rendered by [marked](https://marked.js.org), with two
additions: every heading below the title links to itself, and every code block
gets a copy button.

## Headings link to themselves

Hover this heading and a `#` appears to its right. It holds its space while
invisible, so hovering never nudges the line it sits on. The id comes from the
words, lowercased and hyphenated, and a repeat gets a number.

## Code, and the one button

```rust
// The copy button is built by script rather than shipped in the markup, so a
// reader without JavaScript is never offered a button that cannot work.
fn main() {
    println!("hello from the example site");
}
```

Inline code — `--site example` — sits on the same tinted panel, one shade off
the page, with no border of its own.

## Tables

| flag | default | what it is |
| --- | --- | --- |
| `--out` | *required* | where the built site is written |
| `--site` | *none* | the registry key this site is named by |
| `--static` | *none* | a directory copied verbatim into the output |

Wide tables scroll rather than squeezing the column.

## Quotes and lists

> A quotation is set in the dim ink with a rule down its left, which is enough
> to say it is quoted without saying it twice.

1. Ordered lists keep the body rhythm.
2. So do unordered ones.
   - Including where they nest.

## Pictures

<figure class="cover">
<img src="/cover.svg" alt="A stack of pages, each one an index of the pages below it">
<span class="credit">A placeholder, drawn in this example's <code>public/</code>.</span>
</figure>

A picture in `<figure class="cover">` floats beside the words on a wide screen
and unfloats on a narrow one, where a column that thin would leave the text in
a gutter. The `credit` line under it is set small and dim, for the attribution
that a borrowed engraving needs.

Something served from elsewhere goes in an `iframe` with `class="embed"`, which
frames it like a code block so it reads as part of the page rather than as a
hole punched through it.
