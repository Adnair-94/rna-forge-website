# Secure production deployment

This runbook separates source control, website deployment, contact-form security and domain email authentication. Do not merge or change production DNS until the relevant reviewer has approved the release.

## 1. GitHub repository

Create a ruleset targeting `main` with these controls:

- require a pull request before merging;
- require at least one approval and dismiss stale approvals;
- require conversation resolution;
- require the `Validate site` status check and an up-to-date branch;
- block force pushes and branch deletion;
- allow bypass only for a documented emergency owner.

Enable private vulnerability reporting, secret scanning and push protection. Set the default workflow token to read-only. Require two-factor authentication for every collaborator; an RNA Forge organisation with two owners is preferable to long-term ownership by one personal account.

## 2. Protected environments

Create `github-pages` and `contact-production` environments. Restrict both to `main`, prevent administrator bypass and require a named production reviewer. The Pages workflow deploys automatically after an approved merge; the contact Worker remains manually dispatched.

Repository Actions variable:

- `TURNSTILE_SITE_KEY` - public production site key, restricted to the production hostnames.

Repository or environment secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TURNSTILE_SECRET`
- `CONTACT_RECIPIENT`

Never store a Turnstile secret or mailbox destination as a repository variable.

## 3. Protected contact service

Before the first Worker deployment:

1. Add the domain to Cloudflare and create a Turnstile widget for the final apex and `www` hostnames.
2. Onboard the sending domain to Cloudflare Email Service and verify the private destination mailbox.
3. Review the existing SPF record before adding another sender. A domain must have one combined SPF record, not multiple competing records.
4. Add the four required secrets above to the `contact-production` environment.
5. Run **Deploy protected contact service** manually and test a real enquiry before enabling the public Pages deployment.

The Worker uses the custom hostname `contact.rnaforge.com`, validates Turnstile server-side, checks the expected action and hostname, rate limits repeated submissions, silently absorbs honeypot traffic and never takes its delivery address from the browser.

## 4. Custom website domain

When the site and legal copy are approved:

1. Verify the chosen custom domain in the GitHub account or organisation.
2. Keep GitHub's TXT verification record in DNS permanently.
3. Avoid wildcard DNS records.
4. Configure the apex and/or `www` record using the values shown by GitHub Pages.
5. Set the canonical domain in GitHub Pages and update `_config.yml`, `sitemap.xml` and `robots.txt` in a reviewed pull request.
6. Wait for certificate issuance and enable **Enforce HTTPS**.

Do not add a `CNAME` file or alter production DNS before the final hostname is confirmed.

## 5. Domain email protection

Inventory every legitimate sender first: the mailbox provider, newsletter service, CRM, contact Worker and any transactional service. Use the provider-specific DKIM keys and combine all authorised senders into one SPF record. Then roll out DMARC in stages: monitoring, quarantine and finally reject after reports show that legitimate mail passes.

SPF, DKIM and DMARC reduce domain spoofing; they do not stop inbound spam sent to a mailbox that has already been harvested. Keep the destination out of public source, disable catch-all mail, use provider spam filtering and require two-step verification for mailbox administrators.
