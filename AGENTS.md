# RNA Forge Website Implementation Brief

Last updated: 2026-08-20.

Use this file as the source of truth for future Codex work on the RNA Forge GitHub Pages website.

## Design Direction

RNA Forge should read as a credible spinout company, not an academic lab. Keep the visual system clean, spacious, light, professional and restrained, close to the current RNA Forge/Moderna-like aesthetic without copying another company. Do not copy RiboPro or Dillico aesthetics; Dillico was referenced only for the familiar mobile three-bar menu behavior.

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

Contact is a direct pill-style nav item. Following stakeholder feedback on 2026-08-20, do not use nested dropdown menus. Desktop shows the six top-level links directly. At widths of 900px and below, hide the links behind a three-bar `details`/`summary` menu that is operable by keyboard and tap without JavaScript.

## Asset Folder Rules

Use clean semantic filenames only: lowercase, hyphen-separated, no spaces, dates, brackets, ampersands, typo filenames or ChatGPT/source-export names. Do not reference legacy logo or graphics directories in live HTML/CSS.

Folder conventions:

- `assets/logos/`
- `assets/logos/funders/selected/`
- `assets/logos/funders/library/`
- `assets/brand/`
- `assets/icons/selected/`
- `assets/icons/library/`
- `assets/images/hero/selected/`
- `assets/images/hero/library/`
- `assets/images/technology/selected/`
- `assets/images/technology/library/`
- `assets/images/equipment/selected/`
- `assets/images/equipment/library/`
- `assets/images/funding/library/`
- `assets/images/team/`
- `assets/fonts/`

Use `selected/` only for assets referenced by the live website. Use `library/` for candidate assets.

Active live assets:

- `assets/logos/rna-forge-logo-standard-colour.png`
- `assets/logos/rna-forge-logo-standard-white-punched.png`
- `assets/logos/funders/selected/innovate-uk-logo.jpg`
- `assets/logos/funders/selected/cepi-logo-colour.png`
- `assets/logos/funders/selected/university-of-sheffield-logo-violet.png`
- `assets/logos/funders/selected/northern-gritstone-logo.jpg`
- `assets/logos/funders/selected/ng-studios-kq-labs-logo.png`
- `assets/logos/funders/selected/royal-academy-of-engineering-logo.png`
- `assets/images/hero/selected/home-hero-rna-forge-flow.png`
- `assets/images/technology/selected/rnabox-modular-workflow-scheme.png`
- `assets/images/equipment/selected/modular-rna-manufacturing-system-concept.png`
- `assets/images/equipment/selected/automated-fluid-handling-module-concept.png`
- `assets/images/equipment/selected/chromatography-unit-concept.png`
- `assets/images/equipment/selected/rna-reactor-concept.png`
- `assets/images/team/team-edwin-wagena.jpg`
- `assets/images/team/team-emma-welbourne.jpg`
- `assets/images/team/team-mark-dickman.jpg`
- `assets/images/team/team-zoltan-kis.jpg`
- `assets/images/team/team-adithya-nair.jpg`
- `assets/images/team/team-caroline-evans.jpg`

## Font Usage

The user confirmed on 2026-08-14 that RNA Forge has the right to use the supplied font on the website. The approved OTF files are bundled and loaded as the `RNAForge` family:

- `assets/fonts/vag-rounded-next-regular.otf`
- `assets/fonts/vag-rounded-next-semibold.otf`
- `assets/fonts/vag-rounded-next-bold.otf`

Use `font-display: swap` and retain `"Segoe UI", Arial, sans-serif` as fallbacks. The shared head include preloads all three approved weights to minimise fallback-font flashes. Convert to WOFF2 only if the licence permits format conversion.

## Product Naming

Display the product name as `RNAbox™` in page titles, prominent headings, labels, calls to action and the first substantive product reference on each relevant page. Later repeated body-copy references may use `RNAbox` to avoid visual clutter. Use the HTML entity `RNAbox&trade;` in HTML content and the Unicode form `RNAbox™` in YAML metadata.

Do not add the trademark symbol to filenames, asset paths, anchor IDs, URL fragments or email subject parameters. Keep technical identifiers such as `rnabox-modular-workflow-scheme.png` and `#rnabox-overview` unchanged.

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
- Do not replace the approved RNA Forge font files with different font assets unless their website-use rights are confirmed.
- Do not use funder, partner or ecosystem logos without permission. The six funder/support logo files listed above were supplied for use in the 2026-08-20 review.
- Do not merge without explicit user approval.
- Do not restart feature implementation when the user asks only for documentation or PR metadata updates.

## Shared Page Architecture

GitHub Pages processes the site with Jekyll. Shared metadata, navigation and footer markup live in:

- `_includes/head.html`
- `_includes/header.html`
- `_includes/footer.html`

Each route keeps its own directory `index.html`, YAML front matter and page-specific `<main>` content. Update shared navigation in the include, not separately in every page.

## Current Branch and PR State

The current review branch is `codex/rna-forge-design-direction`. The active draft PR is #2, "Apply final RNA Forge website design and content":

https://github.com/Adnair-94/rna-forge-website/pull/2

PR #2 currently targets `codex/first-static-site` because it is layered on the first static-site PR. Keep it unmerged until the user explicitly approves merge or retargeting.

The 2026-08-20 review revision simplifies navigation, sharpens Home and Technology copy, moves equipment concepts from Services to Technology, separates manufacturing and bioanalytical pricing, expands reporter names before abbreviations, and rebuilds Funding & Support around a five-stage RNAbox roadmap plus approved research-programme and company-support records.

The shared stylesheet URL uses the release token `?v=20260820-4` so GitHub Pages does not combine revised HTML with a stale cached CSS file. Update this token when a later release changes `assets/css/styles.css`.

## Validation Summary

Latest implementation audit reported:

- double-extension assets: 0
- legacy logo directory references in live text: 0
- legacy graphics directory references in live text: 0
- timestamp/source-name references in live text: 0
- script tags in HTML: 0
- animation keywords in CSS: 0
- `team/index.html` removed and `about/index.html` present
- broken local `href`/`src` references: 0
- eight page templates parsed with no duplicate IDs or missing main landmarks
- desktop navigation contains only the six top-level routes; mobile uses one closed-by-default hamburger menu
- scripts, public forms and animation introduced by the 2026-08-20 revision: 0
- approved `RNAForge` font faces and three head preloads retained
- equipment concept references: Technology 4, Services 0
- workbook-confirmed reporter sequences listed: eGFP, NLuc and FLuc; only eGFP publishes standard charges
- roadmap stages on Funding & Support: 5
- approved funder/support logos referenced on Funding & Support: 6

Branch comparison before the documentation handoff showed `codex/rna-forge-design-direction` ahead of `codex/first-static-site` and not behind.

## Remaining Review Checklist

- Review the stacked PR flow and decide whether PR #2 should remain based on `codex/first-static-site` or later be retargeted/rebased after PR #1.
- Review visual rendering in GitHub Pages preview once the stack is available.
- Check the desktop top-level navigation and mobile hamburger open/close behavior with keyboard, touch and screen-reader semantics.
- Review mobile responsiveness across home, technology, services, funding, about, contact and privacy pages.
- Review hero, RNAbox scheme, equipment concept and team image crops/sizing; compress the large selected PNG assets before final launch.
- Preserve the approved RNA Forge font implementation; consider WOFF2 only if permitted by the licence.
- Confirm investor-facing claims and wording with company stakeholders.
- Confirm the final public wording and supplied dates for company-building support, particularly the Royal Academy of Engineering Enterprise Fellowship record, before launch.
- Obtain commercial approval for eGFP catalogue pricing, NLuc/FLuc quotation wording and all analytical package inclusions and charges.

## Next Steps

1. Perform manual visual QA of the Jekyll-rendered GitHub Pages preview.
2. Obtain legal review of the Privacy notice and commercial review of pricing before launch.
3. Compress selected hero, icon, scheme and equipment PNG assets.
4. Make only review-driven adjustments on the existing PR branch.
5. Resolve the stacked PR plan: merge PR #1 first, then decide whether to retarget/rebase PR #2 before final review.
6. Keep PR #2 as a draft until the user approves moving toward merge.
