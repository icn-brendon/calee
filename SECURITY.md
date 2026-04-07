# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 2026.4.x | Yes |
| < 2026.4.1 | No |

## Reporting a vulnerability

If you discover a security vulnerability in Calee, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email security concerns to the maintainer via the contact information on the [GitHub profile](https://github.com/icn-brendon), or use GitHub's private vulnerability reporting feature:

1. Go to the [repository security tab](https://github.com/icn-brendon/calee/security).
2. Click "Report a vulnerability".
3. Fill in the details and submit.

## What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response timeline

- **Acknowledgement:** Within 48 hours of report.
- **Assessment:** Within 7 days.
- **Fix:** Depending on severity, typically within 14 days for critical issues.

## Scope

The following are in scope:

- Authentication and authorisation bypasses in the role system
- Data exposure through WebSocket commands or service actions
- Injection vulnerabilities in import parsing (CSV/ICS)
- Credential leaks through diagnostics or logs
- Cross-site scripting in the frontend panel

The following are out of scope:

- Issues that require Home Assistant admin access (admins are trusted)
- Denial of service through large data imports (known limitation)
- Vulnerabilities in Home Assistant core itself

## Data handling

Calee stores all data locally within the Home Assistant instance. No data is sent to external servers. Database credentials (when using MariaDB/PostgreSQL) are stored in the HA config entry and redacted in diagnostics output.
