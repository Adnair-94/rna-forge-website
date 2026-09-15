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
    text = CONFIG.read_text(encoding="utf-8")
    configured = re.search(r'^turnstile_site_key: "([A-Za-z0-9_-]+)"\s*$', text, re.MULTILINE)
    site_key = os.environ.get("TURNSTILE_SITE_KEY", "").strip()
    if not site_key and configured and configured[1] != PLACEHOLDER:
        site_key = configured[1]
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", site_key):
        raise SystemExit("TURNSTILE_SITE_KEY is missing or malformed")
    if site_key in TEST_KEYS:
        raise SystemExit("A Cloudflare test key cannot be used for production")

    if configured and configured[1] == site_key:
        print("Production public configuration already prepared")
        return
    if text.count(PLACEHOLDER) != 1:
        raise SystemExit("Expected exactly one Turnstile site-key placeholder")
    CONFIG.write_text(text.replace(PLACEHOLDER, site_key), encoding="utf-8")
    print("Production public configuration prepared")


if __name__ == "__main__":
    main()
