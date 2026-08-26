from __future__ import annotations

import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "_config.yml"
PLACEHOLDER = "__TURNSTILE_SITE_KEY__"
TEST_KEYS = {
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "1x00000000000000000000BB",
    "2x00000000000000000000BB",
    "3x00000000000000000000FF",
}


def main() -> None:
    site_key = os.environ.get("TURNSTILE_SITE_KEY", "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", site_key):
        raise SystemExit("TURNSTILE_SITE_KEY is missing or malformed")
    if site_key in TEST_KEYS:
        raise SystemExit("A Cloudflare test key cannot be used for production")

    text = CONFIG.read_text(encoding="utf-8")
    if text.count(PLACEHOLDER) != 1:
        raise SystemExit("Expected exactly one Turnstile site-key placeholder")
    CONFIG.write_text(text.replace(PLACEHOLDER, site_key), encoding="utf-8")
    print("Production public configuration prepared")


if __name__ == "__main__":
    main()
