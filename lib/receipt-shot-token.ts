import { createHmac, timingSafeEqual } from "crypto";

/**
 * Short-lived HMAC tokens for the internal receipt render page
 * (`/receipt-shot/[id]`). The headless browser used by
 * `/api/receipt-image` carries no user session, so the API route mints a
 * token proving "a staff member authorized this render N seconds ago".
 *
 * Server-only: the secret is derived from the Supabase service-role key
 * (never shipped to the client). Tokens expire after 5 minutes.
 */

const TOKEN_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const key =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Service-role key not configured");
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`receipt-shot:${payload}`).digest("hex");
}

/** Mint a token for rendering `donationId` as a JPEG. */
export function createReceiptShotToken(donationId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${donationId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a token minted by {@link createReceiptShotToken}. */
export function verifyReceiptShotToken(
  token: string | null,
  donationId: string
): boolean {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [id, expStr, sig] = parts;
    if (id !== donationId) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expected = sign(`${id}.${expStr}`);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
