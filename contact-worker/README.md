# Protected contact worker

This Cloudflare Worker validates every contact submission server-side with Turnstile, rate limits repeated submissions, rejects a hidden honeypot field and sends validated messages to one private destination through Resend's HTTPS API. IONOS remains the DNS provider and Google remains the mailbox provider.

Requests are throttled using a hash of Cloudflare's client IP header, independently of the supplied email address, before reading the form body or contacting Turnstile. A missing IP uses a shared fallback allowance; limiter errors fail closed. The binding allows five attempts per minute per key, with approximate counters local to each Cloudflare location, not a guaranteed global quota.

The body reader counts received bytes and cancels at more than 25,000 bytes before parsing. Content-Length is only an early rejection hint, never the enforcement boundary. URL-encoded and multipart forms are accepted; other media types are rejected. Tests cover email rotation, independent IPs, missing or misleading length headers, streamed UTF-8 data, the exact size boundary and malformed forms. All delivery and Turnstile calls in tests are mocked: no real enquiry is sent.

Required Worker secrets:

- `TURNSTILE_SECRET`
- `CONTACT_RECIPIENT`
- `CONTACT_SENDER`
- `RESEND_API_KEY`

Create a sending-only Resend key restricted to the verified sending domain in the dashboard. Never place these values in source files, repository variables, browser code or workflow logs. The sender must belong to the verified domain; the recipient is the team's approved inbox. Neither is taken from browser input. The submitter is used only as Reply-To.

Delivery also requires `CONTACT_DELIVERY_ENABLED = "true"`. It defaults to false in both configurations; merely adding credentials cannot activate it. The website's separate `contact_form_enabled` switch must remain false until real delivery is approved.

Resend calls have an eight-second timeout and do not follow redirects. Success requires an HTTP success response and a non-empty message ID. No blind retries occur after an ambiguous failure, and provider response content is never logged. An accepted message ID is not proof of inbox delivery: check the provider delivery event and receiving inbox during the real test. A timeout could still mean the provider accepted the email; check before resubmitting.

## Staging without a DNS migration

`wrangler.staging.toml` is a separate, initially disabled Worker configuration using Cloudflare's supplied `workers.dev` address and its own rate-limit namespace. It does not create a custom domain or change DNS. Configure separate staging secrets using that configuration, verify the actual deployed URL, and enable delivery only for the agreed test. No staging Worker or test page has been provisioned yet.

The staging hostname/action and origin checks stay active. Its return URL retains the GitHub Pages repository path. Prepare a controlled test-page build with the actual endpoint in both the form action and CSP, a real Turnstile widget restricted to the test host, and no browser-side credentials. Do not enable the current public review form as a substitute for staging. Turn off staging delivery after testing.

## Production hosting remains a launch blocker

The old `contact.rnaforge.com` Worker route required Cloudflare DNS. It has been removed from the deployment configuration, not from live DNS. The disabled website still has that placeholder endpoint until an actual endpoint is approved. Do not migrate nameservers as part of email setup.

Cloudflare recommends a custom route/domain for business-critical production Workers rather than `workers.dev`. Resolve the production hosting/address while retaining IONOS DNS, then update the deployment route, site endpoint and CSP together in a reviewed release. The production workflow refuses deployment unless `CONTACT_HOSTING_APPROVED` is explicitly true in the protected environment. That flag is not a substitute for a reviewed working route or the required reviewer approval.

Sources: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Cloudflare workers.dev guidance](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

Run the dependency-free tests with `npm test`. Deployment and DNS steps are documented in `../docs/SECURE_DEPLOYMENT.md`.

