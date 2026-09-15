# RNA Forge launch preparation

Updated 15 September 2026. This is a preparation checklist, not authorisation to change DNS or enable production enquiries.

## Completed in this pass

- Generated smaller WebP web copies of four equipment images, six icons and the home artwork. Original PNGs, licensed fonts and the approved RNAbox diagram are retained. WebP encoding is lossless after resizing equipment to 800px and icons to 256px.
- Added intrinsic dimensions to the optimised images and retained responsive gallery proportions.
- Restored a visible keyboard focus outline in navigation.
- Kept analytical quality-attribute headers in the mobile accessibility tree and associated every method/price cell with its headers.
- Corrected About heading overflow at 320px.
- Added `contact_form_enabled: false`. A configured Turnstile key alone no longer enables the public form. Change this only in a reviewed release after real delivery tests.

## Checks and limits

Seven primary pages were checked at 320, 390, 768 and 1440px in Chromium. One About overflow was found at 320px and corrected, then rechecked. Each page had one main landmark and H1, image alt attributes, labelled form controls and no broken images among the images loaded in the check. Keyboard Enter toggled the mobile menu in both directions with visible focus. Currency selectors synchronised and announced the update. All 28 analytical data cells referenced existing headers.

Source validation and all 21 contact/currency tests pass. External CAPTCHA and email calls are mocked in these tests. This is not a penetration test, a WCAG certification, a physical-device/Safari test or a field Core Web Vitals measurement. Screen-reader user testing and real enquiry delivery remain release checks.

## DNS inventory, read only

Public DNS lookups on 15 September 2026 returned:

| Record | Current result | Treatment |
| --- | --- | --- |
| Apex A | 217.160.0.67 | Replace only at approved website switch |
| Apex AAAA | 2001:8d8:100f:f000::200 | Replace or remove stale website target at switch |
| Nameservers | ns1018.ui-dns.de, ns1099.ui-dns.com, ns1070.ui-dns.org, ns1050.ui-dns.biz | Keep until any DNS migration is separately approved |
| Apex MX | smtp.google.com, priority 1 | Preserve Google email routing |
| Apex TXT | Google verification present; no SPF returned | Preserve verification; confirm all senders before creating a single SPF policy |
| google._domainkey TXT | Google DKIM public key present | Preserve unchanged; verify signing with a received-message header |
| _dmarc CNAME | dmarc.ionos.co.uk, resolving to p=none | Preserve pending a separate mail-policy review |
| www CNAME | No name returned | Configure for website at switch |
| contact A | No name returned | Contact endpoint not provisioned |

This is not a complete zone export. Obtain the full IONOS zone inventory, including verification records, other DKIM selectors, CAA and any additional senders, before changing anything.

## Proposed website DNS, not applied

First verify domain ownership in GitHub using the exact TXT name/value GitHub generates. Keep that record. Configure the custom domain in GitHub before pointing website DNS at it. Use `rnaforge.com` as canonical only after final confirmation.

| Type | Host | Proposed values |
| --- | --- | --- |
| A | @ | 185.199.108.153; 185.199.109.153; 185.199.110.153; 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153; 2606:50c0:8001::153; 2606:50c0:8002::153; 2606:50c0:8003::153 |
| CNAME | www | adnair-94.github.io |

Use one record per IP, not a semicolon-separated value. The www target has no repository path. Do not add wildcard records. Replace the old website A/AAAA targets without changing Google mail records. Update the site's URL/baseurl and metadata in an approved release, await certificate issuance, enable Enforce HTTPS and test apex/www redirects and internal links. Keep the previous zone export for rollback.

Source: [GitHub custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Contact-service decision required

The existing Worker uses Cloudflare Email Service. That service requires Cloudflare DNS; the current domain uses IONOS DNS. Do not activate Cloudflare onboarding or replace nameservers as an incidental form step. Choose either an approved DNS migration that preserves Google email, or a revised sending service compatible with the existing DNS arrangement. The domain registration can remain with IONOS in either case.

Source: [Cloudflare Email Service setup](https://developers.cloudflare.com/email-service/get-started/send-emails/).

After the architecture is agreed, provision the sending domain and Worker, restrict the Turnstile widget to the approved hosts, and store credentials only in protected environment secrets. Do not add incoming Cloudflare Email Routing MX records over Google's MX records. The contact-production environment must require the named reviewer before deployment.

## Team delivery test, before enabling enquiries

1. Configure a controlled staging form/endpoint with the same production validation controls and approved test hostname. Do not disable Turnstile to make testing easier.
2. Submit a non-confidential test enquiry. Confirm the intended inbox receives it, Reply-To uses the submitter, and no unexpected destination is used.
3. Check spam placement and SPF/DKIM/DMARC results in the received message. Check failure handling without sending confidential content.
4. Re-run automated security tests and verify no recipient or secret appears in HTML, browser scripts or logs.
5. Record team sign-off. Only then change `contact_form_enabled` to true through the approved release process.

Production review configuration, Emma's accepted permissions, real delivery and final domain/HTTPS sign-off remain pending. No DNS, mail routing, secrets or production environment permissions were changed in this preparation pass.

