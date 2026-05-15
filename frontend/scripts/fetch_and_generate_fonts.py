#!/usr/bin/env python3
"""
Fetch selected Google Fonts CSS and download woff2 files into public/fonts,
then generate src/fonts-local.css that @font-face's the downloaded files.

Run from repository root: python frontend/scripts/fetch_and_generate_fonts.py
"""
import os
import re
import sys
import ssl
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_FONTS = os.path.join(ROOT, "public", "fonts")
SRC_CSS = os.path.join(ROOT, "src", "fonts-local.css")

FONTS = [
    {"family": "Inter", "weights": [300,400,500,700,800,900]},
    {"family": "Roboto", "weights": [300,400,500,700]},
    {"family": "Poppins", "weights": [300,400,500,700]},
    {"family": "Montserrat", "weights": [300,400,500,700]},
    {"family": "Source Sans 3", "weights": [300,400,500,700]},
    {"family": "Noto Sans", "weights": [300,400,500,700]},
    {"family": "Lora", "weights": [400,700]},
    {"family": "Merriweather", "weights": [300,400,700]},
]

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36"


def fetch_css(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urlopen(req, context=ctx) as resp:
        return resp.read().decode("utf-8")


def download_url(url: str, dest: str):
    req = Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urlopen(req, context=ctx) as resp, open(dest, "wb") as out:
        out.write(resp.read())


def ensure_dirs():
    os.makedirs(PUBLIC_FONTS, exist_ok=True)
    os.makedirs(os.path.dirname(SRC_CSS), exist_ok=True)


def parse_blocks(css_text: str):
    # split into @font-face blocks
    blocks = re.split(r"@font-face\s*{", css_text)
    results = []
    for blk in blocks[1:]:
        body = blk.split('}')[0]
        fam_m = re.search(r"font-family:\s*'(?P<fam>[^']+)'", body)
        weight_m = re.search(r"font-weight:\s*(?P<weight>[0-9]+)", body)
        src_m = re.search(r"url\((?P<url>https?://[^)]+)\)\s*format\('woff2'\)", body)
        if fam_m and weight_m and src_m:
            results.append({
                "family": fam_m.group('fam'),
                "weight": int(weight_m.group('weight')),
                "url": src_m.group('url'),
            })
    return results


def family_query_name(name: str) -> str:
    return name.replace(' ', '+')


def main():
    ensure_dirs()
    faces = []

    for f in FONTS:
        family = f['family']
        weights = f['weights']
        wstr = ';'.join(str(w) for w in weights)
        query = family_query_name(family)
        url = f"https://fonts.googleapis.com/css2?family={query}:wght@{wstr}&display=swap"
        print(f"Fetching CSS for {family} -> {url}")
        try:
            css = fetch_css(url)
        except Exception as e:
            print(f"Failed to fetch CSS for {family}: {e}", file=sys.stderr)
            continue

        blocks = parse_blocks(css)
        if not blocks:
            print(f"No font-face blocks parsed for {family}")
            continue

        for b in blocks:
            src_url = b['url']
            parsed = urlparse(src_url)
            name = os.path.basename(parsed.path)
            dest = os.path.join(PUBLIC_FONTS, name)
            if not os.path.exists(dest):
                try:
                    print(f"  Downloading {src_url} -> {dest}")
                    download_url(src_url, dest)
                except Exception as e:
                    print(f"  Failed to download {src_url}: {e}", file=sys.stderr)
                    continue
            else:
                print(f"  Already downloaded {name}")

            faces.append({
                'family': b['family'],
                'weight': b['weight'],
                'file': name,
            })

    # write src/fonts-local.css
    try:
        with open(SRC_CSS, 'w', encoding='utf-8') as handle:
            handle.write('/* Auto-generated local fonts CSS */\n')
            handle.write('/* Fonts are served from /fonts/ via Vite public directory */\n\n')
            for f in faces:
                handle.write("@font-face {\n")
                handle.write(f"  font-family: '{f['family']}';\n")
                handle.write("  font-style: normal;\n")
                handle.write(f"  font-weight: {f['weight']};\n")
                handle.write(f"  font-display: swap;\n")
                handle.write(f"  src: url('/fonts/{f['file']}') format('woff2');\n")
                handle.write("}\n\n")
        print(f"Wrote {SRC_CSS} with {len(faces)} @font-face rules")
    except Exception as e:
        print(f"Failed to write {SRC_CSS}: {e}", file=sys.stderr)


if __name__ == '__main__':
    main()
