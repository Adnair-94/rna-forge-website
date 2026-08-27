# Security policy

## Supported deployment

Only the version deployed from the protected `main` branch is supported. Draft branches and pull-request previews are not production services.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting from the repository **Security** tab. Do not open a public issue and do not include credentials, personal data, proprietary RNA information or other confidential material in a report.

Please include the affected URL or file, the steps needed to reproduce the issue, the likely impact and any suggested mitigation. RNA Forge will acknowledge a complete report as soon as practicable and will coordinate remediation before public disclosure.

## Operational rules

- Never commit passwords, API tokens, Turnstile secrets, mailbox destinations or DNS-provider credentials.
- Production changes must pass the required site check and be merged through a reviewed pull request.
- Production deployments must originate from `main` and pass the protected deployment environment.
- The public website must not expose a mailbox address or use browser-only bot validation.
