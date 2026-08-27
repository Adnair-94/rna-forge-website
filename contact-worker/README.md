# Protected contact worker

This Cloudflare Worker validates every contact submission server-side with Turnstile, rate limits repeated submissions, rejects a hidden honeypot field and sends only validated messages to a private destination through a restricted email binding.

Required Worker secrets:

- `TURNSTILE_SECRET`
- `CONTACT_RECIPIENT`

The recipient must be a verified Cloudflare Email Service destination. Never place either value in source files, repository variables or workflow logs.

Run the dependency-free tests with `npm test`. Deployment and DNS steps are documented in `../docs/SECURE_DEPLOYMENT.md`.
