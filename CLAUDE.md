# Design System — Emerald Visual Identity

This app follows a clean, modern emerald visual identity with rounded geometry and Bengali typography.

> **AI agents / coding assistants:** Also read [AGENTS.md](AGENTS.md) for engineering invariants, architecture rules, testing requirements, and the **mandatory doc-sync checklist** before committing. The full documentation system is in [`docs/`](docs/).

## Color Tokens (defined in `app/globals.css` `@theme`)

- **Primary / Deep Green:** `#064E3B` (used for banners, branding surfaces, dark cards)
- **Primary Light / Emerald:** `#059669` / `emerald-600` (main brand color, active nav, primary CTAs, positive accents)
- **Accent (Amber):** `#F59E0B` / `amber-600` (targets, warnings, highlight badges)
- **Page Background:** `#FDFDFC` / `#FDFCF9` (warm off-white)
- **Card Background:** `#FFFFFF`
- **Border:** `#F3F4F6` / `emerald-100/50`
- **Negative / Expense:** `#E11D48` / `rose-600`
- **Text Primary:** `#111827` / `gray-900`
- **Text Secondary:** `#4B5563` / `gray-500`
- **Text Muted / Labels:** `gray-400` / uppercase tracking-widest

## Typography

- **Headings & Titles:** `'Tiro Bangla', serif` (`font-tiro`)
- **Body & UI Text:** `'Hind Siliguri', sans-serif` (`font-hind`)
- **Numbers / Currency:** Formatted in Bengali locale via `.toLocaleString("bn-BD")` prefixed with `৳`

## Component Patterns

- **Cards:** `.card-premium` — `bg-white`, `border border-gray-100`, `rounded-2xl` (desktop `rounded-[2rem]`), subtle hover shadow + lift
- **Primary Buttons:** `.btn-emerald` — `bg-emerald-600`, text white, `rounded-2xl`, min-height 48px, active scale-95
- **Secondary Buttons:** `.btn-outline` — `bg-white`, `border border-gray-200`, text gray-700, `rounded-2xl`
- **Sidebar (Desktop):** White background, emerald active highlight (`bg-emerald-600 text-white shadow-lg`), dark gray for admin section
- **Mobile Navigation:** Fixed top header + bottom navigation bar (Home, Donations, Expenses, Members, Profile) + slide-out drawer for full menu
- **Receipts (JPEG):** Follows `/reference/receipt-design.jsx` canvas spec (`#064E3B` header gradient, `#C9A227` gold accent, Bengali typography, QR code).
