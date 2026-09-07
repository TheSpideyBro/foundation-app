# Product Vision

## দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন

**English:** Daulkhandar Purbarpara Hilful Fuyul Foundation

## Purpose

A community fund management application built for a local Bengali welfare foundation. The app digitizes the traditional "khata" (ledger book) workflow — collecting monthly member pledges (chada), tracking donations and expenses, generating official receipts, and producing financial reports. Everything is in Bengali (Bangla) with Bengali numerals, Bengali month names, and a visual identity inspired by physical ledger books.

## Problem

Community welfare foundations in Bangladesh traditionally manage funds using physical ledger books (khata). This leads to:
- No digital backup of financial records
- Difficulty tracking member pledge compliance over time
- Manual receipt generation is slow and error-prone
- No automated overdue alerts or collection rate visibility
- Reports require manual compilation from paper records
- No way for members to verify their own payment history

## Solution

A Progressive Web App (PWA) that provides:
- **Digital Joma Entry** (জমা এন্ট্রি): Record member payments with real-time allocation preview
- **Automated Receipt Generation**: Premium Bengali receipts with QR codes, signatures, and number-to-words
- **Member Ledger**: Per-member monthly breakdown of expected, paid, and overdue amounts
- **Financial Dashboard**: Collection rate, expense breakdown, member status at a glance
- **WhatsApp Alerts**: Automatic donation confirmations sent via WhatsApp Cloud API
- **Google Sheets Backup**: Automatic sync to Google Sheets for redundancy
- **Role-based Access**: Admin, Treasurer, and Member roles with appropriate permissions

## Target Users

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Admin** (অ্যাডমিন) | Foundation leader / president | Full access: user management, pledge control, bulk operations, audit logs, all CRUD |
| **Treasurer** (ট্রেজারার) | Fund collector / treasurer | Record payments, view reports, manage donations and expenses, send WhatsApp alerts |
| **Member** (সদস্য) | Foundation member | View own ledger, download receipts, view notices |

## Core Principles

1. **One Canonical Allocation Algorithm**: TypeScript, SQL, UI, and reports MUST share the same payment allocation logic. No parallel implementations.
2. **payment_allocations is the Source of Truth**: All financial views derive from this table.
3. **Bengali First**: All UI text, numbers, dates, and receipts are in Bengali.
4. **Audit-Friendly**: Every financial action is logged. Every allocation is traceable.
5. **Offline-Capable**: PWA with service worker for limited offline access.
6. **Member Privacy**: Members can only see their own data. Staff see what their role permits.

## Non-Goals

- Multi-language support (Bengali only)
- Multi-currency (BDT only)
- Mobile native apps (PWA only)
- Complex accounting features (double-entry bookkeeping, chart of accounts)
- Payment gateway integration (manual collection only)
