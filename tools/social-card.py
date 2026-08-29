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
import hashlib
import tempfile
import tomllib
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo

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


def from_registry(key, where, root):
    """The same powderworks.toml the generator reads, so a name, a face and a
    picture are written once rather than once here and once in a build script."""
    where = Path(where or Path(__file__).resolve().parent.parent / "powderworks.toml")
    config = tomllib.loads(where.read_text())
    mine = config.get("site", {}).get(key)
    if mine is None:
        raise SystemExit(f"no [site.{key}] in {where}")
    return {
        "name": mine.get("name"),
        "tagline": mine.get("tagline", ""),
        "url": (mine.get("url") or "").removeprefix("https://").removeprefix("http://").rstrip("/"),
        "logo": named(root, "cover") or named(where.parent / "assets" / key, "cover"),
        "font": mine.get("wordmark", {}).get("ttf"),
        "out": str(Path(root) / "social.png"),
    }


def named(root, stem):
    """Pictures are found by name rather than by a path written down somewhere.
    A site's own copy wins; otherwise the one that ships beside the config, so
    the workshop's pages can show a project's mark without cloning it."""
    for found in sorted(Path(root).glob(f"{stem}.*")):
        return str(found)
    return None


STAMP = "powderworks-card"


def fingerprint(said):
    """What the card is a function of: the words, the picture, the face, and
    the code that arranges them.

    Comparing the drawings instead would mean comparing rendering, and freetype
    hints differently from one version to the next, so a card drawn on a laptop
    and checked on a runner never matches to the byte. Comparing what went in
    has no such problem, and it answers the question actually being asked --
    whether the committed card is still the one this config describes.
    """
    digest = hashlib.sha256()
    for word in (said.name, said.tagline, said.url):
        digest.update(f"{word or ''}\x00".encode())
    for path in (said.logo, local(said.font), __file__):
        if path:
            digest.update(Path(path).read_bytes())
    return digest.hexdigest()[:16]


def compare(said, stamp):
    where = Path(said.out)
    if not where.exists():
        raise SystemExit(f"{said.out} is not committed; run without --check first")
    was = Image.open(where).text.get(STAMP)
    if was == stamp:
        print(f"{said.out}  matches the config  [{stamp}]")
        return
    raise SystemExit(
        f"{said.out} was drawn from {was or 'an unrecorded input'}, "
        f"the config now says {stamp}: run the social script and commit it"
    )


def main():
    parse = argparse.ArgumentParser(description=__doc__)
    parse.add_argument("--site", help="key in powderworks.toml; fills the rest")
    parse.add_argument("--config", help="read that file from somewhere else")
    parse.add_argument("--root", default="public", help="where web paths resolve")
    parse.add_argument("--name")
    parse.add_argument("--tagline")
    parse.add_argument("--url")
    parse.add_argument("--logo")
    parse.add_argument("--font", help="ttf or otf, path or URL")
    parse.add_argument("--out")
    parse.add_argument(
        "--check",
        action="store_true",
        help="compare with the committed card rather than overwriting it",
    )
    said = parse.parse_args()

    if said.site:
        for field, value in from_registry(said.site, said.config, said.root).items():
            if getattr(said, field) is None:
                setattr(said, field, value)
    for needed in ("name", "font", "out"):
        if getattr(said, needed) is None:
            raise SystemExit(f"--{needed} is required without --site")
    said.tagline = said.tagline or ""
    said.url = said.url or ""

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

    stamp = fingerprint(said)
    if said.check:
        return compare(said, stamp)

    marked = PngInfo()
    marked.add_text(STAMP, stamp)
    Path(said.out).parent.mkdir(parents=True, exist_ok=True)
    card.save(said.out, optimize=True, pnginfo=marked)
    print(f"{said.out}  {WIDTH}x{HEIGHT}  {Path(said.out).stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
