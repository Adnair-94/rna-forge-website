# RNA Forge website

Static RNA Forge company website deployed through GitHub Pages.

## Architecture

- Clean directory routes such as `technology/index.html`
- Shared Jekyll includes in `_includes/` for head, header and footer markup
- One shared stylesheet at `assets/css/styles.css`
- No analytics, advertising trackers or user accounts
- Protected contact form with Cloudflare Turnstile and a separately deployed Worker
- Automated source validation and least-privilege GitHub Pages deployment
- Full-length commit pins for every GitHub Action
- Asset selection and implementation rules documented in `AGENTS.md`

GitHub Actions performs the production Jekyll build. The deployment fails closed until a production Turnstile site key is configured. Keep PR #2 in draft until the site has completed content, legal, commercial, security and visual review.

Run local checks with:

```powershell
python scripts/validate_site.py --allow-missing-binary-assets
npm test --prefix contact-worker
```

See `docs/SECURE_DEPLOYMENT.md` before changing branch rules, DNS, email authentication or production environments.
