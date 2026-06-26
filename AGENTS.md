# RNA Forge Website Project Instructions

Use this file as the source of truth for future Codex work on the RNA Forge website.

## Project

This repository contains the static website for RNA Forge, a spinout developing manufacturability-focused RNA technologies and services.

## Site Scope

Build and maintain a static GitHub Pages-compatible website with these pages:

- Home
- Technology
- Services
- Funding & Support
- Team
- Contact
- Privacy

Use clean GitHub Pages routes for interior pages:

- `/technology/`
- `/services/`
- `/funding/`
- `/team/`
- `/contact/`
- `/privacy/`

Keep `index.html` at the repository root for the home page. Interior pages should live in directory `index.html` files such as `technology/index.html`.

## Architecture

- Keep the site static and compatible with GitHub Pages.
- Do not add backend form handling unless explicitly requested.
- Use shared header and footer navigation across pages.
- Keep styling in one shared stylesheet at `assets/css/styles.css`.
- Use the PNG assets already in `assets/logo` and `assets/graphics`.
- Keep `sitemap.xml` and `robots.txt` up to date when routes change.

## Positioning and Tone

RNA Forge must look and read like a spinout company website, not an academic lab website.

Language should be:

- investor-facing
- technically credible
- commercially serious
- concise and partner-ready

Avoid academic-lab framing, publication-led language, and overly speculative claims.

## Contact Form

The contact form should remain a static form layout until backend handling is explicitly requested.

The contact page must include this confidentiality warning:

> Confidentiality warning: Do not submit confidential, proprietary, or sensitive information through this form. RNA Forge cannot treat information submitted here as confidential unless a written confidentiality agreement is in place.

## Review Workflow

Prepare changes for review in a branch or pull request. Do not merge without explicit user approval.
