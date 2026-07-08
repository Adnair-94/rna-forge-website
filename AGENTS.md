# RNA Forge Website Implementation Brief

Last updated: 2026-07-09.

Use this file as the source of truth for future Codex work on the RNA Forge GitHub Pages website.

## Design Direction

RNA Forge should read as a credible spinout company, not an academic lab. Keep the visual system clean, spacious, light, professional and restrained, close to the current RNA Forge/Moderna-like aesthetic without copying another company. Do not copy RiboPro aesthetics; only the dropdown navigation behavior was requested from that reference.

Language should be investor-facing, technically credible, commercially serious, concise and partner-ready. Avoid publication-led, academic-lab or generic biotech framing.

## Site Structure and Navigation

Keep the site static and GitHub Pages compatible. Use `index.html` at the root and directory `index.html` files for clean routes:

- Home: `/`
- Technology: `/technology/`
- Services: `/services/`
- Funding & Support: `/funding/`
- About: `/about/`
- Contact: `/contact/`
- Privacy: `/privacy/`

Use shared header and footer navigation across pages. Keep `sitemap.xml` and `robots.txt` aligned with route changes.

Main navigation:

- Home
- Technology
- Services
- Funding & Support
- About
- Contact

Contact is a direct nav item or pill-style button and should not have a dropdown.

Dropdown structure:

- Technology: RNAbox overview; Modular manufacturing; Integrated analytics & control; Development roadmap
- Services: RNA manufacturing; Off-the-shelf mRNAs; Bioanalytical services; Technical development support
- Funding & Support: Innovation funding; Project timeline; Investors & collaborators
- About: Company; Team; Ecosystem

Desktop dropdowns should open on hover and keyboard focus. Mobile/tablet dropdowns should work as tap accordion controls. The current implementation uses CSS-only `details`/`summary` behavior.

## Asset Folder Rules

Use clean semantic filenames only: lowercase, hyphen-separated, no spaces, dates, brackets, ampersands, typo filenames or ChatGPT/source-export names. Do not reference legacy `assets/logo/` or `assets/graphics/` paths in live HTML/CSS.

Folder conventions:

- `assets/logos/`
- `assets/brand/`
- `assets/icons/selected/`
- `assets/icons/library/`
- `assets/images/hero/selected/`
- `assets/images/hero/library/`
- `assets/images/technology/selected/`
- `assets/images/technology/library/`
- `assets/images/team/`
- `assets/fonts/`

Use `selected/` only for assets referenced by the live website. Use `library/` for candidate assets.

Active live assets:

- `assets/logos/rna-forge-logo-standard-colour.png`
- `assets/images/hero/selected/home-hero-rna-forge-flow.png`
- `assets/images/technology/selected/rnabox-modular-workflow-scheme.png`
- `assets/images/team/team-edwin-wagena.jpg`
- `assets/images/team/team-emma-welbourne.jpg`
- `assets/images/team/team-mark-dickman.jpg`
- `assets/images/team/team-zoltan-kis.jpg`
- `assets/images/team/team-adithya-nair.jpg`
- `assets/images/team/team-caroline-evans.jpg`

## Font Usage

Use the RNA Forge font files from `assets/fonts/` only when web embedding is confirmed or explicitly provided for the website. The current CSS defines the `RNAForge` family from the available OTF files:

- `assets/fonts/vag-rounded-next-regular.otf`
- `assets/fonts/vag-rounded-next-semibold.otf`
- `assets/fonts/vag-rounded-next-bold.otf`

Use `font-display: swap` and fall back to `"Segoe UI", Arial, sans-serif`. Prefer WOFF2 files later if properly licensed and supplied.

## Claim Control

Avoid these claims or terms unless explicitly approved:

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

Prefer language such as:

- modular
- progressive integration
- translational planning
- pilot deployment preparation
- reduced manufacturing burden
- improved product understanding
- analytically informed development

The contact page must keep `info@rnaforge.com` as the primary live route. Any form must remain static/disabled until privacy and security handling is implemented, and must include the warning not to submit confidential RNA sequences, proprietary formulations, unpublished process details or sensitive commercial information through the public form.

## Do Not Do

- Do not add external scripts, analytics, trackers, CDNs, third-party libraries or backend form handling.
- Do not add animation unless explicitly requested.
- Do not upload or bundle new font files unless the web-embedding licence is confirmed.
- Do not use funder, partner or ecosystem logos without permission.
- Do not merge without explicit user approval.
- Do not restart feature implementation when the user asks only for documentation or PR metadata updates.

## Current Branch and PR State

The current review branch is `codex/rna-forge-design-direction`. The active draft PR is #2, "Apply final RNA Forge website design and content":

https://github.com/Adnair-94/rna-forge-website/pull/2

PR #2 currently targets `codex/first-static-site` because it is layered on the first static-site PR. Keep it unmerged until the user explicitly approves merge or retargeting.

## Validation Summary

Latest implementation audit reported:

- double-extension assets: 0
- old `assets/logo/` references in live text: 0
- old `assets/graphics/` references in live text: 0
- timestamp/source-name references in live text: 0
- script tags in HTML: 0
- animation keywords in CSS: 0
- `team/index.html` removed and `about/index.html` present
- broken local `href`/`src` references: 0

Branch comparison before the documentation handoff showed `codex/rna-forge-design-direction` ahead of `codex/first-static-site` and not behind.

## Remaining Review Checklist

- Review the stacked PR flow and decide whether PR #2 should remain based on `codex/first-static-site` or later be retargeted/rebased after PR #1.
- Review visual rendering in GitHub Pages preview once the stack is available.
- Check dropdown hover/focus behavior on desktop and tap accordion behavior on mobile.
- Review mobile responsiveness across home, technology, services, funding, about, contact and privacy pages.
- Review hero, RNAbox scheme and team image crops/sizing.
- Confirm font web-embedding licence and optionally replace OTF references with WOFF2 files later.
- Confirm investor-facing claims and wording with company stakeholders.

## Next Steps

1. Perform manual visual QA in a GitHub Pages preview or local static preview.
2. Make only review-driven adjustments on the existing PR branch.
3. Resolve the stacked PR plan: merge PR #1 first, then decide whether to retarget/rebase PR #2 before final review.
4. Keep PR #2 as a draft until the user approves moving toward merge.
