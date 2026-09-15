"""Validate the existing static site and ensure this PR changes only its backend."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import os
import posixpath
import subprocess
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def validate(pages, tracked):
    errors = []
    parsed = {name: Page(source) for name, source in pages.items()}
    ids = {name: [attrs['id'] for _, attrs in page.tags if 'id' in attrs] for name, page in parsed.items()}
    for name, page in parsed.items():
        def require(condition, message):
            if not condition:
                errors.append(f'{name}: {message}')
        counts = Counter(tag for tag, _ in page.tags)
        require(counts['main'] == 1, 'expected one main landmark')
        require(counts['h1'] == 1, 'expected one h1')
        require(counts['title'] == 1, 'missing or duplicate title')
        require(any(tag == 'html' and attrs.get('lang') for tag, attrs in page.tags), 'missing page language')
        require(any(tag == 'meta' and attrs.get('name') == 'viewport' for tag, attrs in page.tags), 'missing viewport')
        require(len(ids[name]) == len(set(ids[name])), 'duplicate IDs')
        for tag, attrs in page.tags:
            if tag == 'img':
                require('alt' in attrs, 'image missing alt attribute')
            for attr in ('src', 'href'):
                if not attrs.get(attr):
                    continue
                url = urlsplit(attrs[attr])
                if url.scheme or url.netloc:
                    continue
                target = unquote(url.path)
                target = posixpath.normpath(target.lstrip('/') if target.startswith('/') else posixpath.join(posixpath.dirname(name), target)) if target else name
                if target == '.' or url.path.endswith('/'):
                    target = posixpath.join(target, 'index.html').removeprefix('./')
                require(target in tracked, f'broken local {attr}: {attrs[attr]}')
                if url.fragment and target in parsed:
                    require(unquote(url.fragment) in ids[target], f'missing anchor: {attrs[attr]}')
    return errors


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    os.chdir(root)
    tracked = set(git('ls-files').splitlines())
    pages = {name: (root / name).read_text(encoding='utf-8') for name in tracked if name.endswith('.html') and not name.startswith('contact-worker/')}
    if not pages:
        raise SystemExit('No website pages found')
    errors = validate(pages, tracked)
    base = os.environ.get('SITE_BASE_SHA', '')
    if base:
        allowed_workflows = {'.github/workflows/contact-backend-check.yml', '.github/workflows/deploy-contact-staging.yml', '.github/workflows/deploy-contact-worker.yml'}
        changed = git('diff', '--name-only', base, 'HEAD').splitlines()
        errors.extend(f'Outside backend-only scope: {name}' for name in changed if not name.startswith('contact-worker/') and name not in allowed_workflows)
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Validated {len(pages)} existing site pages: landmarks, titles, language, viewport, IDs, image alternatives and internal links/assets/anchors.')
    if base:
        print('Website files are unchanged from the PR base; backend-only scope confirmed.')

