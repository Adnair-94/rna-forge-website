from __future__ import annotations

import argparse
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    ROOT / "index.html",
    ROOT / "technology" / "index.html",
    ROOT / "services" / "index.html",
    ROOT / "funding" / "index.html",
    ROOT / "about" / "index.html",
    ROOT / "contact" / "index.html",
    ROOT / "contact" / "sent" / "index.html",
    ROOT / "contact" / "error" / "index.html",
    ROOT / "privacy" / "index.html",
    ROOT / "404.html",
]
INCLUDE_NAMES = ("head.html", "header.html", "footer.html")
INCLUDES = {name: (ROOT / "_includes" / name).read_text(encoding="utf-8") for name in INCLUDE_NAMES}
APPROVED_ACTIONS = {
    "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d",
    "actions/jekyll-build-pages@44a6e6beabd48582f863aeeb6cb2151cc1716697",
    "actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b",
    "actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
    "cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0",
}


class StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.main = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "main" and values.get("id") == "main-content":
            self.main = True


def strip_front_matter(text: str) -> str:
    return re.sub(r"\A---\r?\n.*?\r?\n---\r?\n", "", text, count=1, flags=re.S)


def render_for_structure(text: str) -> str:
    rendered = strip_front_matter(text)
    for name, content in INCLUDES.items():
        rendered = rendered.replace(f"{{% include {name} %}}", content)
    rendered = re.sub(r"{%.*?%}", "", rendered, flags=re.S)
    return re.sub(r"{{.*?}}", "/", rendered, flags=re.S)


def resolve_local(page: Path, reference: str) -> Path | None:
    if "{{" in reference or "{%" in reference:
        return None
    parsed = urlsplit(reference)
    if parsed.scheme or reference.startswith(("#", "mailto:", "tel:")):
        return None
    if not parsed.path:
        return None
    target = ROOT / parsed.path.lstrip("/") if parsed.path.startswith("/") else page.parent / parsed.path
    if parsed.path.endswith("/"):
        target /= "index.html"
    return target.resolve()


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--production", action="store_true")
    parser.add_argument("--allow-missing-binary-assets", action="store_true")
    args = parser.parse_args()
    errors: list[str] = []

    source_files = list(ROOT.rglob("*.html")) + list(ROOT.rglob("*.css"))
    public_source = "\n".join(path.read_text(encoding="utf-8") for path in source_files)

    for page in PAGES:
        check(page.exists(), f"Missing page: {page.relative_to(ROOT)}", errors)
        if not page.exists():
            continue
        text = page.read_text(encoding="utf-8")
        check(text.startswith("---\n"), f"Missing front matter: {page.relative_to(ROOT)}", errors)
        check("{% include header.html %}" in text, f"Missing shared header: {page.relative_to(ROOT)}", errors)
        check("{% include footer.html %}" in text, f"Missing shared footer: {page.relative_to(ROOT)}", errors)

        document = StructureParser()
        document.feed(render_for_structure(text))
        duplicates = sorted(item for item, count in Counter(document.ids).items() if count > 1)
        check(not duplicates, f"Duplicate IDs in {page.relative_to(ROOT)}: {duplicates}", errors)
        check(document.main, f"Missing main landmark: {page.relative_to(ROOT)}", errors)

        for reference in re.findall(r'(?:href|src)="([^"]+)"', text):
            target = resolve_local(page, reference)
            if target is None or target.exists():
                continue
            binary = target.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".otf"}
            if not (args.allow_missing_binary_assets and binary):
                errors.append(f"Broken local reference in {page.relative_to(ROOT)}: {reference}")

    css = (ROOT / "assets" / "css" / "styles.css").read_text(encoding="utf-8")
    head = INCLUDES["head.html"]
    contact = (ROOT / "contact" / "index.html").read_text(encoding="utf-8")
    config = (ROOT / "_config.yml").read_text(encoding="utf-8")
    workflows = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / ".github" / "workflows").glob("*.yml"))

    check("mailto:" not in public_source.lower(), "A public mailto link remains", errors)
    check("info@rnaforge.com" not in public_source.lower(), "The public mailbox remains exposed", errors)
    check(public_source.lower().count("<form") == 1, "Expected exactly one public form", errors)
    check(public_source.lower().count("<script") == 1, "Expected only the conditional Turnstile script", errors)
    check("https://challenges.cloudflare.com/turnstile/v0/api.js" in head, "Turnstile client script missing", errors)
    check("Content-Security-Policy" in head and "object-src 'none'" in head and "form-action 'self'" in head, "CSP baseline missing", errors)
    check(all(item in contact for item in ("company_website", "cf-turnstile", "data-action=\"contact\"", "name=\"consent\"")), "Protected form controls are incomplete", errors)
    check("site.contact_form_endpoint" in contact and "https://contact.rnaforge.com/" in config, "Protected form endpoint is not configured", errors)
    check("TURNSTILE_SECRET" not in public_source, "A private Turnstile secret appears in public site source", errors)
    check("__TURNSTILE_SITE_KEY__" not in config if args.production else "__TURNSTILE_SITE_KEY__" in config, "Turnstile public-key state is incorrect for this build", errors)
    check(css.count("@font-face") == 3 and all(name in css for name in ("vag-rounded-next-regular.otf", "vag-rounded-next-semibold.otf", "vag-rounded-next-bold.otf")), "Approved font faces changed", errors)
    check(css.count("{") == css.count("}"), "Unbalanced CSS braces", errors)
    check("@keyframes" not in css and "animation:" not in css, "Animation was introduced", errors)
    check(all(colour in css for colour in ("#4dc0e4", "#60ba84", "#60bfbd", "#98c76b")), "Approved brand colours are incomplete", errors)

    action_refs = set(re.findall(r"uses:\s*([^\s#]+)", workflows))
    check(action_refs == APPROVED_ACTIONS, f"Unapproved or missing action references: {sorted(action_refs ^ APPROVED_ACTIONS)}", errors)
    check("pull_request_target" not in workflows, "Unsafe pull_request_target trigger found", errors)
    check("permissions:\n  contents: read" in workflows, "Least-privilege workflow permissions missing", errors)
    check("environment:\n      name: github-pages" in workflows, "Protected Pages environment missing", errors)
    check((ROOT / ".github" / "CODEOWNERS").exists(), "CODEOWNERS missing", errors)
    check((ROOT / "SECURITY.md").exists(), "Security policy missing", errors)
    check((ROOT / ".github" / "dependabot.yml").exists(), "Dependabot configuration missing", errors)

    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("VALIDATION PASSED")
    print(f"- Pages checked: {len(PAGES)}")
    print("- Public mailbox and mailto links: 0")
    print("- Protected contact form: Turnstile + honeypot + server-side endpoint")
    print("- GitHub Actions: full commit pins and least-privilege permissions")
    print("- Approved RNAForge fonts and brand colours retained")


if __name__ == "__main__":
    main()
