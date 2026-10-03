"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Shield, Loader2, Share2, Download, MessageCircle } from "lucide-react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers";
import { isStaff as hasStaffRole } from "@/lib/auth";
import ReceiptPaper from "@/components/ReceiptPaper";
import ReceiptJpegButton from "@/components/ReceiptJpegButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import {
  fetchDonationForReceipt,
  fetchBatchConsolidation,
  buildReceiptPaperProps,
  type ReceiptDonation as Donation,
  type BatchConsolidation,
} from "@/lib/receipt-props";

export default function ReceiptViewPage() {
  const { id } = useParams<{ id: string }>();
  const { role, memberId } = useAuth();
  const isStaff = hasStaffRole(role);

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Batch-consolidated display (same logic as the JPEG receipt)
  const [batch, setBatch] = useState<BatchConsolidation>({
    batchMonth: null,
    batchAmount: null,
    batchReceiptNo: null,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // Staff and members (own donations, enforced by RLS) may load.
    void loadDonation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadDonation() {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDonationForReceipt(supabase(), id as string);
      if (!d) {
        setError("রসিদ লোড করা যায়নি");
      } else {
        setDonation(d);
        setBatch(await fetchBatchConsolidation(supabase(), d));
      }
    } catch (err) {
      setError(
        "রসিদ লোড করা যায়নি: " +
          (err instanceof Error ? err.message : "অজানা ত্রুটি")
      );
    }
    setLoading(false);
  }

  // Client-only after mount: window.location.origin differs between server
  // and client render, so building this in render would cause a hydration
  // mismatch (QR flicker). The QR stays hidden until the URL is ready.
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  useEffect(() => {
    if (donation?.receipt_no) {
      setVerifyUrl(
        `${window.location.origin}/verify/${encodeURIComponent(donation.receipt_no)}`
      );
    } else {
      setVerifyUrl(null);
    }
  }, [donation?.receipt_no]);

  // Query-param modes, read client-side only (same hydration-safe pattern —
  // no useSearchParams, which would need a Suspense boundary):
  //   ?embed=1 → chromeless embed for the donations-page preview iframe
  //               (hides the action bar; the app shell is hidden via <style>)
  //   ?print=1 → auto-print once the receipt has loaded (download action)
  const [isEmbed, setIsEmbed] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbed(params.get("embed") === "1");
    setAutoPrint(params.get("print") === "1");
  }, []);

  // ?print=1: print exactly once after load, only when the viewer may see
  // the receipt. The ref guards against StrictMode double-effects.
  const printedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || loading || !donation) return;
    const viewable =
      isStaff || (memberId !== null && memberId === donation.member_id);
    if (!viewable || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(t);
  }, [autoPrint, loading, donation, isStaff, memberId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-akkas text-gray-500">
        <Loader2 className="animate-spin" size={24} />
        রসিদ লোড হচ্ছে…
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="mx-auto max-w-md p-8 text-center font-akkas">
        <h1 className="mb-2 font-shadhinata text-2xl font-bold text-gray-900">
          রসিদ পাওয়া যায়নি
        </h1>
        <p className="text-gray-500">{error || "এই আইডির কোনো দান পাওয়া যায়নি।"}</p>
        <Link href="/donations" className="btn-outline mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          জমা তালিকায় ফিরুন
        </Link>
      </div>
    );
  }

  // Same gate as the legacy JPEG receipt: staff OR the member who owns the
  // donation. Row access itself is enforced by RLS; this is only the UI gate.
  const canView = isStaff || (memberId !== null && memberId === donation.member_id);
  if (!canView) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center font-akkas">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-xl shadow-red-100">
          <Shield size={40} />
        </div>
        <h1 className="mb-2 font-shadhinata text-2xl font-bold text-gray-900">
          প্রবেশাধিকার সংরক্ষিত
        </h1>
        <p className="max-w-xs text-gray-500">
          এই রসিদটি শুধুমাত্র সংশ্লিষ্ট সদস্য, অ্যাডমিন ও ট্রেজারাররা দেখতে
          পারেন। আপনার যদি মনে হয় এটি ভুল, তবে প্রধান অ্যাডমিনের সাথে
          যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-akkas text-gray-500">
        <Loader2 className="animate-spin" size={24} />
        রসিদ লোড হচ্ছে…
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="mx-auto max-w-md p-8 text-center font-akkas">
        <h1 className="mb-2 font-shadhinata text-2xl font-bold text-gray-900">
          রসিদ পাওয়া যায়নি
        </h1>
        <p className="text-gray-500">{error || "এই আইডির কোনো দান পাওয়া যায়নি।"}</p>
        <Link href="/donations" className="btn-outline mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          জমা তালিকায় ফিরুন
        </Link>
      </div>
    );
  }

  const receiptProps = buildReceiptPaperProps(donation, batch, verifyUrl);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          /* U-M10: the app shell (fixed mobile header, bottom nav, desktop
             sidebar) is not .no-print — hide it explicitly so only the
             receipt prints. The ?print=1 download tab depends on this. */
          header, aside, nav { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          body { background: #fff !important; }
          .receipt-stage { background: #fff !important; padding: 0 !important; }
          .receipt-paper {
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 175mm !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      {isEmbed && (
        <style>{`
          /* ?embed=1: the page renders inside the donations preview iframe —
             hide the app shell and reset the shell's main offsets. */
          header, aside, nav { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
        `}</style>
      )}

      <div className={`receipt-stage min-h-screen px-4 py-8 font-akkas sm:py-12 ${isEmbed ? "bg-[#F4F1EA]" : "bg-[#0a0f0d]"}`}>
        {!isEmbed && (
          <div className="no-print mx-auto mb-8 flex max-w-2xl items-center justify-between">
            <Link
              href="/donations"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white"
            >
              <ArrowLeft size={16} />
              জমা তালিকা
            </Link>
            <div className="flex items-center gap-2">
              <ReceiptJpegButton
                donationId={donation.id}
                mode="share"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                title="রসিদ শেয়ার (JPG)"
                ariaLabel="রসিদ শেয়ার"
              >
                <Share2 size={16} />
                শেয়ার
              </ReceiptJpegButton>
              <WhatsAppShareButton
                donationId={donation.id}
                phone={donation.members?.[0]?.phone}
                memberName={donation.members?.[0]?.name ?? undefined}
                receiptNo={donation.receipt_no}
                amount={Number(donation.amount) || 0}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                title="WhatsApp-এ পাঠান"
                ariaLabel="WhatsApp-এ রসিদ পাঠান"
              >
                <MessageCircle size={16} />
                WhatsApp
              </WhatsAppShareButton>
              <ReceiptJpegButton
                donationId={donation.id}
                mode="download"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                title="রসিদ ডাউনলোড (JPG)"
                ariaLabel="রসিদ ডাউনলোড"
              >
                <Download size={16} />
                JPG
              </ReceiptJpegButton>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-[#C9A227] px-5 py-2 text-sm font-bold text-[#022C22] shadow-[0_8px_24px_rgba(201,162,39,0.35)] transition hover:brightness-110"
              >
                <Printer size={16} />
                প্রিন্ট করুন
              </button>
            </div>
          </div>
        )}

        <ReceiptPaper {...receiptProps} />

        {!isEmbed && (
          <p className="no-print mx-auto mt-6 max-w-2xl text-center text-xs text-stone-500">
            প্রিন্ট করলে উপরের বাটনগুলো বাদ যাবে — শুধু রসিদটি কাগজে আসবে।
          </p>
        )}
      </div>
    </>
  );
}
