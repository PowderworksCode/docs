#!/usr/bin/env python3
"""Draw the card a link to a site shows when it is unfurled.

One card per site, same bones each time: the name in the site's own face,
its tagline, its domain, and its logo down the right-hand side. What varies
between sites is the face and the picture, which is the whole idea -- these
are meant to look like relatives.

    python3 social-card.py --name Straitjacket \
        --tagline "A secret scanner, but for slop." \
        --url straitjacket.dev \
        --logo site/public/engraving.jpg \
        --font https://raw.githubusercontent.com/google/fonts/main/ofl/x/X.ttf \
        --out site/public/social.png

Needs Pillow. The face must be a ttf or otf: woff2 is for browsers, and
Pillow cannot read it. A URL is downloaded to a temporary file.
"""
import argparse
import functools
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
MARGIN = 72
GUTTER = 56
INK = (17, 17, 17)
QUIET = (85, 85, 85)
PAPER = (253, 253, 252)
RULE = (227, 227, 224)
BODY_FACES = [
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]


@functools.cache
def local(where):
    """A URL is fetched once, however many sizes get tried against it."""
    if not str(where).startswith(("http://", "https://")):
        if not Path(where).exists():
            raise SystemExit(f"no font at {where}")
        return str(where)
    try:
        with urllib.request.urlopen(where) as response:
            body = response.read()
    except urllib.error.HTTPError as bad:
        raise SystemExit(f"{bad.code} fetching {where}") from None
    handle = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False)
    handle.write(body)
    handle.close()
    return handle.name


def face(where, size):
    return ImageFont.truetype(local(where), size)


def body_face(size):
    for candidate in BODY_FACES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size)


def width_of(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


NAME_CEILING, NAME_FLOOR, NAME_LINES = 112, 52, 2


def fitted(draw, text, where, room):
    """Largest size at which the name fits, wrapping rather than shrinking past
    the floor. A name set smaller than the tagline under it reads as a caption,
    which is the wrong way round however well it fits."""
    for size in range(NAME_CEILING, NAME_FLOOR, -2):
        font = face(where, size)
        lines = wrapped(draw, text, font, room)
        if len(lines) <= NAME_LINES and all(width_of(draw, l, font) <= room for l in lines):
            return font, lines
    font = face(where, NAME_FLOOR)
    return font, wrapped(draw, text, font, room)


def wrapped(draw, text, font, room):
    lines, line = [], ""
    for word in text.split():
        nudged = f"{line} {word}".strip()
        if line and width_of(draw, nudged, font) > room:
            lines.append(line)
            line = word
        else:
            line = nudged
    return lines + [line] if line else lines


def draw_logo(card, path):
    """Down the right-hand side, as tall as the margins allow."""
    art = Image.open(path).convert("RGB")
    tall = HEIGHT - MARGIN * 2
    wide = round(art.width * tall / art.height)
    if wide > WIDTH * 0.42:
        wide = round(WIDTH * 0.42)
        tall = round(art.height * wide / art.width)
    art = art.resize((wide, tall), Image.LANCZOS)
    left, top = WIDTH - MARGIN - wide, (HEIGHT - tall) // 2
    card.paste(art, (left, top))
    ImageDraw.Draw(card).rectangle(
        [left - 1, top - 1, left + wide, top + tall], outline=RULE
    )
    return left


def main():
    parse = argparse.ArgumentParser(description=__doc__)
    parse.add_argument("--name", required=True)
    parse.add_argument("--tagline", default="")
    parse.add_argument("--url", default="")
    parse.add_argument("--logo")
    parse.add_argument("--font", required=True, help="ttf or otf, path or URL")
    parse.add_argument("--out", required=True)
    said = parse.parse_args()

    card = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(card)
    edge = draw_logo(card, said.logo) if said.logo else WIDTH - MARGIN
    room = edge - GUTTER - MARGIN

    name, titles = fitted(draw, said.name, said.font, room)
    tagline = body_face(38)
    domain = body_face(27)
    lines = wrapped(draw, said.tagline, tagline, room) if said.tagline else []

    leading = round(name.size * 1.16)
    height = len(titles) * leading + len(lines) * 48
    if said.url:
        height += 92
    top = max(MARGIN, (HEIGHT - height) // 2)

    cursor = top
    for title in titles:
        draw.text((MARGIN, cursor), title, font=name, fill=INK)
        cursor += leading
    cursor += 12
    for line in lines:
        draw.text((MARGIN, cursor), line, font=tagline, fill=QUIET)
        cursor += 48
    if said.url:
        cursor += 22
        draw.line([MARGIN, cursor, MARGIN + min(300, room), cursor], fill=RULE, width=1)
        draw.text((MARGIN, cursor + 20), said.url, font=domain, fill=QUIET)

    Path(said.out).parent.mkdir(parents=True, exist_ok=True)
    card.save(said.out, optimize=True)
    print(f"{said.out}  {WIDTH}x{HEIGHT}  {Path(said.out).stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
