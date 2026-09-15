# Protected contact worker

## Backend-only release

This change adds only the contact Worker, its tests and deployment workflows. It does not change the website HTML, assets, Jekyll configuration, Pages deployment, domain or DNS. The frontend remains in the separate website review PR. Merging this backend change does not deploy a Worker or activate the public form.

The `Contact backend checks` workflow runs mocked tests on pull requests and relevant main-branch changes without secrets or environment access. Deployment workflows are manual, main-only, and use the protected `contact-production` environment. Keep `emmawelbourne` as required reviewer, prevent self-review, disallow administrator bypass, and permit only `main`. A pull-request review and a deployment approval are separate steps.

After an explicitly approved merge, manually run `Deploy disabled contact staging` on `main` and obtain the environment approval. Confirm the deployed Worker is `rna-forge-contact-staging`, with delivery disabled. A GET should return 404 and a POST should return 503 without sending mail. The later controlled inbox/reply test needs a separately reviewed activation step and test page; do not turn on the public website form for this initial deployment.

GitHub environment secrets required by the workflows: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TURNSTILE_SECRET`, `CONTACT_RECIPIENT`, `CONTACT_SENDER`, and `RESEND_API_KEY`. These are references, not values. The deployment token has account-scoped Workers Scripts Edit and Account Settings Read access, so it can change other Workers in that account, not only this staging Worker. Keep it in the protected environment.

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

`wrangler.staging.toml` is a separate, initially disabled Worker configuration using Cloudflare's supplied `workers.dev` address and its own rate-limit namespace. It does not create a custom domain or change DNS. The user created a Hello World placeholder at `rna-forge-contact-staging.adithya-nair.workers.dev` on 15 September 2026; this is not yet the contact handler. No controlled test page has been provisioned yet.

The manual `Deploy disabled contact staging` workflow installs the handler and four Worker secrets using the existing `contact-production` environment. This deliberately retains its main-only branch restriction and independent approval requirement; it does not require duplicating the six GitHub secrets or weakening production rules. Tests run before the deployment requests environment approval. The command explicitly forces delivery off and targets only `wrangler.staging.toml`. The workflow and its code must first be reviewed and merged into `main`; do not bypass that restriction by deploying the review branch with production secrets. A subsequent reviewed change and approval are required to enable the agreed delivery test. Production hosting approval remains a separate launch requirement.

Setup evidence from the user's dashboards confirms the Resend sending domain and DNS records are verified, a managed Turnstile widget has been created, and GitHub secret names have been added. The user reports the account ID is saved. Secret values have not been inspected or validated by a real deployment. The deployment token expires on 14 December 2026; replace it before that date for future deployments.

The staging hostname/action and origin checks stay active. Its return URL retains the GitHub Pages repository path. Prepare a controlled test-page build with the actual endpoint in both the form action and CSP, a real Turnstile widget restricted to the test host, and no browser-side credentials. Do not enable the current public review form as a substitute for staging. Turn off staging delivery after testing.

## Controlled delivery test

The disabled staging deployment completed successfully on 15 September 2026. Live GET returned 404 and POST returned 503 without sending mail. This supersedes the initial setup notes above; secret values remain private and actual inbox delivery is still unverified.

After review and an explicitly approved merge, run `Open 30-minute contact delivery test` on `main`. It uses the same protected environment and requires independent deployment approval. It targets only the staging Worker, keeps the normal website form disabled, and redirects to the separate `/delivery-test/contact/sent/` and `/delivery-test/contact/error/` pages. Publish and check the dedicated test page before starting this workflow.

The deadline is calculated after environment approval, immediately before deployment. Deployment time consumes part of the 30-minute window. Staging requires both integer Unix timestamps with a positive interval of at most 1,800 seconds. Missing, malformed, future or expired windows return 503 without calling either provider. The deadline is checked again after Turnstile, before starting an email send. A provider request already started before the deadline may finish afterward. Expiry is enforced on each request, not by a scheduled job, so no second approval is needed to close the window. The configured enable flag may remain true afterward, but expired timestamps prevent delivery.

The unlinked, noindex test page is publicly reachable, not an authentication boundary. Origin, Turnstile hostname/action, honeypot and rate limiting remain mandatory. The tester should submit only a harmless enquiry, check the receiving inbox and provider delivery event, and check that Reply-To points to the tester. An accepted message ID alone does not confirm delivery. Do not retry an uncertain send before checking the provider and inbox.

To close earlier or restore the baseline configuration, run `Deploy disabled contact staging`, which still explicitly forces delivery off and requires approval. Reopening a test requires a new approved deployment. No production routes, DNS settings, mailbox settings or public form activation are changed by this workflow.

## Production hosting remains a launch blocker

The old `contact.rnaforge.com` Worker route required Cloudflare DNS. It has been removed from the deployment configuration, not from live DNS. The disabled website still has that placeholder endpoint until an actual endpoint is approved. Do not migrate nameservers as part of email setup.

Cloudflare recommends a custom route/domain for business-critical production Workers rather than `workers.dev`. Resolve the production hosting/address while retaining IONOS DNS, then update the deployment route, site endpoint and CSP together in a reviewed release. The production workflow refuses deployment unless `CONTACT_HOSTING_APPROVED` is explicitly true in the protected environment. That flag is not a substitute for a reviewed working route or the required reviewer approval.

Sources: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Cloudflare workers.dev guidance](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

Run the dependency-free tests from this directory with `npm test`, or from the repository root with `npm test --prefix contact-worker`. The separate website review contains the broader launch checklist; it is not part of this backend-only release.
