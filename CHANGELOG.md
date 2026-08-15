# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial project commit with full fund management system
- Bengali-language UI with Bengali numerals (০-৯)
- Role-based access control (admin, treasurer, member)
- Row Level Security (RLS) on all database tables
- Receipt number auto-generation (R-0001, R-0002, …)
- PNG & PDF receipt export via jspdf + html-to-image
- WhatsApp Web Share API integration for receipts
- Service Worker for PWA (cache-first + network-first hybrid)
- Web App Manifest with Bengali metadata
- Expense proof image upload to Supabase Storage
- Monthly/yearly report with Excel (.xlsx) export
- Audit log RPC function (`log_audit_event`)
- Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy
- Playwright E2E test suite
- Mobile-responsive sidebar with hamburger navigation

### Changed
- Design system: "ledger/khata" identity — ink green sidebar, paper cards, gold accents
- Typography: Hind Siliguri (body), Tiro Bangla (headings), JetBrains Mono (numbers)

### Fixed
- RLS policy fixes for donations insert (v1–v4 iterations)
- Case-sensitivity fix for `Members` → `members` table reference
- Service Worker cache invalidation on deployment

---

## [0.1.0] — 2026-08-15

### Added
- First release of the Fund Management App
- Complete dashboard with stat cards and bar chart
- Member management (CRUD, search, status toggle)
- Donation entry with receipt generation
- Expense entry with image proof upload
- Reports page with monthly summary and Excel export
- Admin panel for member role management
- Login/signup page with Supabase Auth
- Responsive layout (desktop sidebar + mobile nav)
- Bengali number formatting throughout
- Money formatting in৳ (Taka) with Bengali numerals

---

## [0.0.1] — 2026-07-30

### Added
- Initial project scaffold
- Next.js 16 + React 19 + TypeScript setup
- Tailwind CSS v4 + shadcn/ui component library
- Supabase client integration
- Base project structure and routing
