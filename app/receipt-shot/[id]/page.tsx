import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReceiptPaper from "@/components/ReceiptPaper";
import { verifyReceiptShotToken } from "@/lib/receipt-shot-token";
import {
  fetchDonationForReceipt,
  fetchBatchConsolidation,
  buildReceiptPaperProps,
} from "@/lib/receipt-props";

/**
 * Internal receipt render target for `/api/receipt-image`.
 *
 * Renders ONLY the premium ReceiptPaper (no app chrome — see
 * LayoutWrapper) at a fixed 800px width so the headless screenshot has
 * deterministic dimensions. Auth is a short-lived HMAC token minted by
 * the image API route (`?token=`); the page is public in proxy.ts but
 * useless without a fresh token.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export default async function ReceiptShotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!id || !verifyReceiptShotToken(token ?? null, id)) notFound();

  const supabase = serviceClient();
  if (!supabase) notFound();

  const donation = await fetchDonationForReceipt(supabase, id);
  if (!donation) notFound();
  const batch = await fetchBatchConsolidation(supabase, donation);

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://daulkharfoundation.vercel.app"
  ).replace(/\/+$/, "");
  const verifyUrl = donation.receipt_no
    ? `${baseUrl}/verify/${encodeURIComponent(donation.receipt_no)}`
    : null;

  const props = buildReceiptPaperProps(donation, batch, verifyUrl);

  return (
    <div
      className="receipt-shot-stage"
      style={{ width: 800, background: "#FDFCF7" }}
    >
      <ReceiptPaper {...props} />
    </div>
  );
}
