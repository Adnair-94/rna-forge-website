# RNA Forge Website Project Instructions

Use this file as the source of truth for future Codex work on the RNA Forge website.

## Project

This repository contains the static GitHub Pages website for RNA Forge, a University of Sheffield spinout developing manufacturability-focused RNA technologies and services.

## Site Scope

Build and maintain a static GitHub Pages-compatible website with these pages:

- Home
- Technology
- Services
- Funding & Support
- About
- Contact
- Privacy

Use clean GitHub Pages routes for interior pages:

- `/technology/`
- `/services/`
- `/funding/`
- `/about/`
- `/contact/`
- `/privacy/`

Keep `index.html` at the repository root for the home page. Interior pages should live in directory `index.html` files such as `technology/index.html`.

## Architecture

- Keep the site static and compatible with GitHub Pages.
- Do not add backend form handling unless explicitly requested.
- Do not add external scripts, analytics, trackers, CDNs or third-party libraries.
- Do not add animation unless explicitly requested.
- Use shared header and footer navigation across pages.
- Keep styling in one shared stylesheet at `assets/css/styles.css`.
- Use only clean semantic asset paths.
- Do not reference `assets/logo/` or `assets/graphics/` in live HTML/CSS.
- Keep `sitemap.xml` and `robots.txt` up to date when routes change.

## Fonts

Use the licensed RNA Forge fonts from `assets/fonts/` via `@font-face` in `assets/css/styles.css`.

- Prefer WOFF2 over OTF when both exist.
- Define the family as `RNAForge`.
- Use Regular for body text, SemiBold for navigation/buttons/card headings and Bold for major headings.
- Use `font-display: swap`.
- Fallback: `"Segoe UI", Arial, sans-serif`.

## Assets

Active live assets should use these paths:

- `assets/logos/rna-forge-logo-standard-colour.png`
- `assets/images/hero/selected/home-hero-rna-forge-flow.png`
- `assets/images/technology/selected/rnabox-modular-workflow-scheme.png`
- `assets/images/team/team-edwin-wagena.jpg`
- `assets/images/team/team-emma-welbourne.jpg`
- `assets/images/team/team-mark-dickman.jpg`
- `assets/images/team/team-zoltan-kis.jpg`
- `assets/images/team/team-adithya-nair.jpg`
- `assets/images/team/team-caroline-evans.jpg`

Use `selected/` only for assets referenced by the live website. Use `library/` for candidate assets. Do not reference timestamped, ChatGPT-named, bracketed, typo, ampersand or space-containing filenames in HTML/CSS.

## Navigation

Main nav:

- Home
- Technology
- Services
- Funding & Support
- About
- Contact

Contact should be direct and should not have a dropdown.

Desktop dropdowns should open on hover and keyboard focus. Mobile/tablet should use tap/click accordion behaviour. Use clean white dropdown panels with subtle border/shadow and RNA Forge accent colour.

## Positioning and Tone

RNA Forge must look and read like a spinout company website, not an academic lab website.

Language should be:

- investor-facing
- technically credible
- commercially serious
- concise and partner-ready
- non-academic
- non-generic biotech

Avoid academic-lab framing, publication-led language and overclaiming.

## Claim Control

Avoid these terms unless explicitly approved:

- GMP-ready
- clinical-grade
- fully automated
- validated
- regulatory-ready
- commercial-scale
- end-to-end
- guaranteed cost reduction
- proven lower cost
- replacement of existing infrastructure

Prefer:

- modular
- progressive integration
- translational planning
- pilot deployment preparation
- reduced manufacturing burden
- improved product understanding
- analytically informed development

## Contact Form

The contact form should remain static and disabled until privacy/security handling is implemented.

The contact page must include this warning:

> Please do not submit confidential RNA sequences, proprietary formulations, unpublished process details or sensitive commercial information through this public form. We can arrange an appropriate confidential discussion if needed.

Use `info@rnaforge.com` as the primary live contact route.

## Review Workflow

Prepare changes for review in a branch or pull request. Do not merge without explicit user approval.
