# Protected contact worker

This Cloudflare Worker validates every contact submission server-side with Turnstile, rate limits repeated submissions, rejects a hidden honeypot field and sends only validated messages to a private destination through a restricted email binding.

Requests are throttled using a hash of Cloudflare's client IP header, independently of the supplied email address, before reading the form body or contacting Turnstile. A missing IP uses a shared fallback allowance; limiter errors fail closed. The binding allows five attempts per minute per key, with approximate counters local to each Cloudflare location, not a guaranteed global quota.

The body reader counts received bytes and cancels at more than 25,000 bytes before parsing. Content-Length is only an early rejection hint, never the enforcement boundary. URL-encoded and multipart forms are accepted; other media types are rejected. Tests cover email rotation, independent IPs, missing or misleading length headers, streamed UTF-8 data, the exact size boundary and malformed forms. All delivery and Turnstile calls in tests are mocked: no real enquiry is sent.

Required Worker secrets:

- `TURNSTILE_SECRET`
- `CONTACT_RECIPIENT`

The recipient must be a verified Cloudflare Email Service destination. Never place either value in source files, repository variables or workflow logs.

Run the dependency-free tests with `npm test`. Deployment and DNS steps are documented in `../docs/SECURE_DEPLOYMENT.md`.
