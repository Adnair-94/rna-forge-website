"""Validate the isolated staging test pages without relaxing normal site checks."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ENDPOINT = "https://rna-forge-contact-staging.adithya-nair.workers.dev/"
SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js"


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def select(self, tag):
        return [attrs for name, attrs in self.tags if name == tag]


def validate(root):
    folder = root / "delivery-test"
    expected = {"index.html", "contact/sent/index.html", "contact/error/index.html"}
    assert {p.relative_to(folder).as_posix() for p in folder.rglob("*.html")} == expected, "Unexpected test pages"
    for name in expected:
        path = folder / name
        source = path.read_text(encoding="utf-8")
        page = Page(source)
        ids = [a["id"] for _, a in page.tags if "id" in a]
        assert len(ids) == len(set(ids)), "Duplicate test-page IDs"
        assert len(page.select("main")) == len(page.select("h1")) == 1
        assert page.select("html")[0].get("lang") == "en"
        assert any(m.get("name") == "viewport" for m in page.select("meta"))
        assert any(m.get("name") == "robots" and "noindex" in m.get("content", "") for m in page.select("meta"))
        assert any(m.get("name") == "referrer" and m.get("content") == "strict-origin" for m in page.select("meta")), "Form POST must preserve Origin without sharing URL paths"
        csp = next(m["content"] for m in page.select("meta") if m.get("http-equiv") == "Content-Security-Policy")
        assert "default-src 'none'" in csp and "base-uri 'none'" in csp and "object-src 'none'" in csp
        for tag, attrs in page.tags:
            assert not any(key.startswith("on") or key == "style" for key in attrs), "Inline code in test page"
            if tag == "img":
                assert "alt" in attrs
            for attr in ("href", "src"):
                ref = attrs.get(attr, "")
                if not ref or ref.startswith("#") or urlsplit(ref).scheme:
                    continue
                target = path.parent / ref
                assert (target / "index.html" if ref.endswith("/") else target).exists(), f"Missing test asset: {ref}"
        if name == "index.html":
            assert len(page.select("form")) == 1
            form = page.select("form")[0]
            assert form["action"] == ENDPOINT and form["method"] == "post"
            assert f"form-action 'self' {ENDPOINT}" in csp
            assert [s.get("src") for s in page.select("script")] == [SCRIPT], "Unexpected test script"
            assert "script-src https://challenges.cloudflare.com" in csp
            widget = next(d for d in page.select("div") if "data-sitekey" in d)
            assert widget["data-sitekey"] == "0x4AAAAAAE136Q1DEdl5FcZ2" and widget["data-action"] == "contact"
            fields = {a["name"]: a for tag in ("input", "select", "textarea") for a in page.select(tag)}
            assert {"name", "email", "organisation", "topic", "message", "consent", "company_website"} <= fields.keys()
            assert "required" in fields["consent"] and "checked" not in fields["consent"]
            assert fields["company_website"]["tabindex"] == "-1"
            assert "Do not submit confidential" in source
        else:
            assert not page.select("form") and not page.select("script")
            assert "form-action 'none'" in csp
            assert any(a.get("href") == "../../" for a in page.select("a"))
    assert "Inbox delivery has not yet been confirmed" in (folder / "contact/sent/index.html").read_text(encoding="utf-8")
    assert "may still have been accepted" in (folder / "contact/error/index.html").read_text(encoding="utf-8")


if __name__ == "__main__":
    validate(Path(__file__).resolve().parents[1])
    print("Delivery test pages validated; normal contact launch state is checked separately.")
