# Secure production deployment

This runbook separates source control, website deployment, contact-form security and domain email authentication. Do not merge or change production DNS until the relevant reviewer has approved the release.

See [the launch checklist](LAUNCH_CHECKLIST.md) for the latest verified state, DNS inventory and outstanding decisions. The controls below are requirements, not a claim that they are already configured.

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
- `CONTACT_SENDER`
- `RESEND_API_KEY`

Never store a Turnstile secret or mailbox destination as a repository variable.

## 3. Protected contact service

Before the first Worker deployment:

The user selected IONOS DNS with Resend for outgoing enquiries. Do not migrate nameservers, enable inbound Resend mail or replace Google's MX records. Cloudflare remains the current form-handler runtime, not the sending service. Production hosting/address setup is still unresolved; see the [Worker README](../contact-worker/README.md).

1. Use a company-owned Resend account with MFA. No paid plan or add-on is authorised. Review its data processing, retention and regional settings before passing real enquiry data through it.
2. Verify an agreed sending subdomain using only the exact DNS records supplied by Resend. Keep incoming email disabled and open/click tracking off. Preserve Google's apex MX, verification and DKIM records. Any provider return-path MX belongs only at the specified sending subdomain, not the apex. Avoid duplicate SPF policies at the same hostname.
3. Create a sending-only key restricted to that verified domain. Configure the Worker secrets above securely, never through chat or committed files. Keep staging and production secrets separate.
4. Create real Turnstile widgets restricted to the corresponding test/production hosts. Prepare controlled staging using `wrangler.staging.toml`; review the actual endpoint and test page before setting staging `CONTACT_DELIVERY_ENABLED` to true. Have the team check inbox delivery, Reply-To, spam placement and authentication. An API acceptance alone is not a delivery test.
5. Resolve production hosting while retaining IONOS DNS. Review and configure the actual route/endpoint and CSP. Only then set the protected environment variable `CONTACT_HOSTING_APPROVED` to true. Keep required reviewer approval and the main-branch restriction; run **Deploy protected contact service** manually after approval.
6. Before launch, update the privacy notice to identify the active processing providers and confirm their terms. Enable production `CONTACT_DELIVERY_ENABLED` only after sign-off, then set `contact_form_enabled: true` in `_config.yml` through the approved release process. A Turnstile key or sending credential alone does not enable enquiries. Verify production delivery once more.

The Worker validates Turnstile server-side, checks the expected action and hostname, rate limits repeated submissions, silently absorbs honeypot traffic and never takes its delivery address from the browser. No production route is configured yet. Disable either delivery switch immediately if abuse or delivery failures occur, and check provider usage/delivery events without logging message contents.

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

