# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Yes              |

## Reporting a Vulnerability

We take the security of **দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন — Fund Management App** seriously.
If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities.
2. Instead, use GitHub's **Security Advisories** feature:
   - Go to the repository → **Security** tab → **Report a vulnerability**
3. Include:
   - A clear description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information (optional)

### What to Expect

- **Acknowledgement**: Within 48 hours
- **Status update**: Within 1 week
- **Resolution**: As soon as possible, depending on severity

## Current Security Measures

### Authentication & Authorization

- **Supabase Auth**: Passwords are hashed using industry-standard algorithms (SHA-256 + salt).
- **Row Level Security (RLS)**: Every table has RLS policies that restrict access based on user role (`admin`, `treasurer`, `member`).
- **Middleware protection**: `middleware.ts` enforces authentication on all non-public routes server-side.
- **No client-side role bypass**: Role checks happen on both client and server; server-side RLS is the source of truth.

### Data Protection

- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are never hardcoded.
- **`.env.local` excluded**: The file containing real credentials is in `.gitignore`.
- **No sensitive data in logs**: User passwords, tokens, or PII are never written to console or audit logs.

### HTTP Security Headers

Configured in `next.config.ts`:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://api.qrserver.com;` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |

### File Upload Security

- Expense proof images are stored in a **private** Supabase Storage bucket (`expense-proofs`).
- Upload policy requires `admin` or `treasurer` role.
- Download URLs are scoped to the bucket — no arbitrary file access.

## Dependency Security

- Run `npm audit` regularly to check for known vulnerabilities.
- Keep `package-lock.json` up to date with `npm update`.

## Best Practices for Contributors

1. **Never commit `.env.local`** — use `.env.example` as the template.
2. **Never log user data** (passwords, tokens, PII).
3. **Always use parameterised queries** — never string-concatenate SQL.
4. **Review RLS policies** whenever adding a new table or column.
5. **Run `npm audit`** before submitting a PR.

## Contact

For security questions or concerns, open a GitHub Security Advisory (see above).
