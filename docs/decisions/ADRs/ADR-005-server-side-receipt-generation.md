# ADR-005: Server-Side Receipt Generation with node-canvas

**Status:** accepted
**Date:** 2026-08

## Context

The app needs to produce official Bengali donation receipts: foundation logo, prefixed header, donation details, amount written in Bengali words, QR code for verification, signature font, gold accents, and a "verified" badge.

An initial attempt used a Python dependency during build, which broke serverless deployment (`941e9fe`). The requirement moved to a pure Node solution.

## Decision

Receipts are rendered server-side as JPEG images using **node-canvas** (`canvas`) at `app/api/receipts/[id]/route.ts`.

- Bengali fonts are registered from `public/fonts/` (`HindSiliguri-Bold/Regular.ttf`, `MainakBuniyadi-Italic.ttf` for signature).
- QR code is generated via the `qrcode` npm package and composited onto the canvas.
- The number-to-words converter is implemented in-app for Bengali amounts.
- Output supports inline display and `?download=1` for download.
- Zero browser dependency: works in serverless and standalone Node.

## Consequences

- **Positive**: Deterministic, high-quality output; works offline and in CI.
- **Positive**: No client bundling of canvas code — receipts are just a URL.
- **Cost**: `canvas` is a native dependency (bundled prebuilt for common platforms; may need `npm rebuild canvas` on unusual platforms).
- **Cost**: Font files must ship with `public/`.

## Alternatives Considered

- **Client-side HTML→Image (html-to-image)**: The donation page uses this for the receipt preview/share; heavier and less deterministic than the server canvas version.
- **jsPDF (client)**: Used for the report PDF export; not suitable for the premium styled image receipt.
- **Python/Pillow**: Rejected — broke deployment; removed dependency.