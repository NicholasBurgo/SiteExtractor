# Security Policy

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Open a [GitHub private security advisory](../../security/advisories/new) on this repository, or email the maintainer directly. Do not use a public issue. Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

Expect an acknowledgement within **7 days** and a resolution timeline within the reply.

## Dual-Use Notice

`backend/scraper_advanced/` contains Cloudflare bypass logic, proxy rotation, and browser fingerprint spoofing. These features exist for **authorized testing only** — e.g. testing your own infrastructure, contracted penetration tests, or academic research on systems you have explicit permission to access.

Contributors must not extend these features to target systems they do not own or have written permission to test. Pull requests that add capabilities primarily useful for unauthorized access will be rejected.

## Known Limitations

- **No authentication**: All API endpoints are unauthenticated. Do not expose the backend port (default 5051) to an untrusted network.
- **Path handling**: `run_id` values are used in filesystem paths. Do not run the backend as root or in a shared environment with untrusted users.
