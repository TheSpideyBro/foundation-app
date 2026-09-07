# ADR-006: Phone Login via Virtual Email Conversion

**Status:** accepted
**Date:** 2026-08

## Context

Bangladeshi users overwhelmingly use phone numbers (not emails) to identify themselves. Supabase Auth fundamentally requires an email or a phone identity provider — and the app aims for a single login field that accepts whichever the user types.

The original implementation stored real emails only; this excluded many members and made login awkward.

## Decision

Login accepts a phone number and **converts it to a virtual email** for Supabase Auth lookup: `{phone}@foundation.local`.

- A single login field works for both phone and email.
- New signups with a phone create the virtual email identity automatically.
- The app later auto-links the auth user to a `members` row whose phone matches — see `/api/admin/auto-link`.

## Consequences

- **Positive**: One login field, phone-first UX, no email dependence.
- **Positive**: Auth identity stays in Supabase Auth while role/name live in the `users` table.
- **Cost**: Virtual emails are not real emails — password reset/notifications must not assume they reach an inbox.
- **Cost**: Deterministic mapping must be consistent across signup, login, and auto-link to avoid duplicate identities.

## Alternatives Considered

- **Supabase phone OTP**: Rejected — requires SMS credits and a phone identity provider configuration not available to the project.
- **Two separate login fields changed by a mode toggle**: Rejected — worse UX, more complex state.