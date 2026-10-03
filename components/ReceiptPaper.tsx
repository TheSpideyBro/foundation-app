import Image from "next/image";
import { MapPin, Phone } from "lucide-react";

export type ReceiptPaperProps = {
  receiptNo: string | null;
  dateLabel: string;
  amountLabel: string;
  amountWords: string;
  donorName: string;
  monthLabel: string;
  methodLabel: string;
  collectorName: string;
  extraAmountLabel: string | null;
  verifyUrl: string | null;
};

/**
 * Premium paper receipt — ornate Islamic-style design.
 * Dark emerald + gold on ivory. Used by the live page, JPG export,
 * and the dev preview. Pure presentational.
 *
 * IMPORTANT: No letter-spacing on Bengali text (breaks conjunct shaping).
 */
export default function ReceiptPaper({
  receiptNo,
  dateLabel,
  amountLabel,
  amountWords,
  donorName,
  monthLabel,
  methodLabel,
  collectorName,
  extraAmountLabel,
  verifyUrl,
}: ReceiptPaperProps) {
  const detailRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "প্রদানকারী", value: donorName },
    { label: "মাসের নাম", value: monthLabel },
    {
      label: "পদবি",
      value: (
        <span className="inline-block rounded-full border border-[#C9A227] bg-[#F5E6C4] px-4 py-1 text-[15px] font-bold text-[#7a5f14]">
          {methodLabel}
        </span>
      ),
    },
    { label: "আদায়কারী", value: collectorName },
    ...(extraAmountLabel ? [{ label: "অতিরিক্ত জমা", value: extraAmountLabel }] : []),
  ];

  return (
    <article
      className="receipt-paper relative mx-auto w-full max-w-2xl overflow-hidden bg-[#FFFEF8]"
      style={{ boxShadow: "0 40px 90px -30px rgba(0,0,0,0.4)" }}
    >
      {/* ── Top arch: dark green dome with gold trim ── */}
      <div className="relative" aria-hidden="true">
        <svg viewBox="0 0 800 130" className="block w-full" preserveAspectRatio="none" style={{ height: 110 }}>
          <defs>
            <pattern id="islamic-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M20 0 L40 20 L20 40 L0 20 Z"
                fill="none"
                stroke="rgba(201,162,39,0.12)"
                strokeWidth="1"
              />
              <circle cx="20" cy="20" r="3" fill="none" stroke="rgba(201,162,39,0.08)" strokeWidth="1" />
            </pattern>
          </defs>
          {/* dark green base */}
          <rect width="800" height="130" fill="#0B4A38" />
          <rect width="800" height="130" fill="url(#islamic-pattern)" />
          {/* gold trim curve */}
          <path
            d="M0,130 C200,60 300,90 400,30 C500,90 600,60 800,130 L800,130 L0,130 Z"
            fill="#FFFEF8"
          />
          <path
            d="M0,122 C200,52 300,82 400,22 C500,82 600,52 800,122"
            fill="none"
            stroke="#C9A227"
            strokeWidth="5"
          />
          <path
            d="M0,130 C200,60 300,90 400,30 C500,90 600,60 800,130"
            fill="none"
            stroke="#0B4A38"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="relative px-6 pb-8 sm:px-10" style={{ marginTop: -30 }}>
        {/* ── Logo emblem ── */}
        <div className="flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center"
            style={{
              background: "#0B4A38",
              clipPath: "polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)",
              border: "3px solid #C9A227",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="1.8">
              <path d="M3 21h18M4 21V10m4 11V10m4 11V10m4 11V10m4 11V10M2 10l10-6 10 6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="2.5" r="1" fill="#C9A227" />
            </svg>
          </div>
        </div>

        {/* ── Tagline ── */}
        <p className="mt-3 text-center text-[15px] font-bold text-[#B8912A]">
          <span className="mx-2">—</span>সেবা <span className="mx-1">•</span> সহায়তা <span className="mx-1">•</span> মানবিকতা<span className="mx-2">—</span>
        </p>

        {/* ── Foundation name ── */}
        <h1 className="mx-auto mt-2 max-w-lg text-center font-shadhinata text-[30px] font-bold leading-tight text-[#0B3D2E] sm:text-[34px]">
          দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন
        </h1>

        {/* ── Contact ── */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] font-medium text-[#0B4A38]">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B4A38]/10">
              <MapPin size={14} className="text-[#0B4A38]" />
            </span>
            দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা
          </span>
          <span className="hidden text-[#C9A227] sm:inline">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B4A38]/10">
              <Phone size={14} className="text-[#0B4A38]" />
            </span>
            <span className="font-bold">০১৬৪০-৮২৮৩০১ • ০১৬৪৮-৪৩৮২৯৪</span>
          </span>
        </div>

        {/* ── Receipt meta pill ── */}
        <div
          className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-between gap-x-8 gap-y-2 rounded-2xl px-6 py-3.5"
          style={{ background: "#EAF2EA", border: "1px solid #D4E2D4" }}
        >
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B4A38" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
            </svg>
            <span className="text-[16px] font-bold text-[#0B4A38]">রসিদ নং:</span>
            <span className="font-mono text-[17px] font-bold text-[#0B3D2E]">{receiptNo || "—"}</span>
          </div>
          <div className="hidden h-8 w-px bg-[#0B4A38]/20 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B4A38" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
            </svg>
            <span className="text-[16px] font-bold text-[#0B4A38]">তারিখ:</span>
            <span className="text-[16px] font-bold text-[#0B3D2E]">{dateLabel}</span>
          </div>
        </div>

        {/* ── Amount hero ── */}
        <div className="mt-7 text-center">
          {/* badge */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-[#C9A227] sm:w-24" aria-hidden="true" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A227" aria-hidden="true">
              <path d="M12 2 C13 8, 18 10, 22 12 C18 14, 13 16, 12 22 C11 16, 6 14, 2 12 C6 10, 11 8, 12 2 Z" />
            </svg>
            <span
              className="rounded-full px-6 py-1.5 text-[17px] font-bold text-white"
              style={{ background: "#0B4A38" }}
            >
              সর্বমোট প্রাপ্তি
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A227" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
              <path d="M12 2 C13 8, 18 10, 22 12 C18 14, 13 16, 12 22 C11 16, 6 14, 2 12 C6 10, 11 8, 12 2 Z" />
            </svg>
            <span className="h-px w-16 bg-[#C9A227] sm:w-24" aria-hidden="true" />
          </div>

          {/* amount */}
          <p className="mt-3 font-baloo text-[56px] font-bold leading-none text-[#0B4A38] sm:text-[64px]">
            {amountLabel}
          </p>

          {/* divider + words */}
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 bg-[#C9A227]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#C9A227]" />
            <span className="h-px flex-1 bg-[#C9A227]" />
          </div>
          <p className="mt-2 text-[16px] font-medium text-[#0B4A38]">
            কথায়: {amountWords} টাকা মাত্র
          </p>
        </div>

        {/* ── Details ── */}
        <dl className="mx-auto mt-6 max-w-lg">
          {detailRows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-6 border-b border-dashed border-[#0B4A38]/15 py-2.5 last:border-0"
            >
              <dt className="shrink-0 text-[16px] font-medium text-[#0B4A38]">{label}</dt>
              <dd className="text-right text-[18px] font-bold text-[#0B3D2E]">{value}</dd>
            </div>
          ))}
        </dl>

        {/* ── Gratitude ── */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-[#C9A227]" aria-hidden="true" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" aria-hidden="true" />
            <p className="font-galada text-[28px] leading-snug text-[#0B4A38]">জাযাকাল্লাহু খাইরান</p>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" aria-hidden="true" />
            <span className="h-px w-12 bg-[#C9A227]" aria-hidden="true" />
          </div>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[#0B4A38]">
            আপনার মহানুভবতার জন্য আন্তরিক ধন্যবাদ — আল্লাহ তায়ালা
            <br />
            আপনার দান কবুল করুন
          </p>
        </div>

        {/* ── QR + Signature ── */}
        {verifyUrl ? (
          <div className="mx-auto mt-6 flex max-w-lg flex-row items-end justify-between gap-4">
            <div className="shrink-0 text-center">
              <div
                className="mx-auto w-fit rounded-xl bg-white p-2"
                style={{ border: "2px solid #0B4A38", boxShadow: "0 6px 18px rgba(11,74,56,0.12)" }}
              >
                <Image
                  src={`/api/qr?text=${encodeURIComponent(verifyUrl)}`}
                  alt="রসিদ যাচাই QR কোড"
                  width={96}
                  height={96}
                  className="h-[96px] w-[96px]"
                  unoptimized
                />
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[14px] font-bold text-[#0B4A38]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B4A38" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01M18 18h.01" strokeLinecap="round" />
                </svg>
                স্ক্যান করে যাচাই করুন
              </p>
            </div>
            <div className="min-w-0 flex-1 max-w-[280px] px-2 text-center">
              <p className="-mb-2 font-teesta text-[22px] leading-tight text-[#0B3D2E]">{collectorName}</p>
              <div className="border-b border-stone-400/70 pb-6" aria-hidden="true" />
              <p className="mt-2 text-[13px] font-bold text-stone-500">আদায়কারীর স্বাক্ষর</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-xs text-center">
            <p className="-mb-2 font-teesta text-[22px] leading-tight text-[#0B3D2E]">{collectorName}</p>
            <div className="border-b border-stone-400/70 pb-6" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-bold text-stone-500">আদায়কারীর স্বাক্ষর</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-7 flex items-center justify-center gap-4">
          <span className="h-px w-20 bg-[#C9A227]/60" aria-hidden="true" />
          <p className="text-[13px] font-medium text-[#0B4A38]">
            নির্দিষ্ট কর্তৃক সত্যতা যাচাইকৃত রসিদ
          </p>
          <span className="h-px w-20 bg-[#C9A227]/60" aria-hidden="true" />
        </div>
      </div>

      {/* ── Bottom ornamental corners ── */}
      <div className="relative h-16" aria-hidden="true">
        <svg viewBox="0 0 800 64" className="absolute bottom-0 block w-full" preserveAspectRatio="none" style={{ height: 64 }}>
          <path d="M0,64 C150,64 120,20 0,10 L0,64 Z" fill="#0B4A38" />
          <path d="M800,64 C650,64 680,20 800,64 L800,64 Z" fill="#0B4A38" />
          <path d="M0,10 C120,20 150,64 0,64" fill="none" stroke="#C9A227" strokeWidth="2" />
          <path d="M800,10 C680,20 650,64 800,64" fill="none" stroke="#C9A227" strokeWidth="2" />
          {/* corner flourishes */}
          <g opacity="0.25" stroke="#C9A227" fill="none" strokeWidth="1.5">
            <path d="M30,45 Q45,30 60,35 Q50,45 30,45" />
            <path d="M770,45 Q755,30 740,35 Q750,45 770,45" />
            <circle cx="45" cy="40" r="2" fill="#C9A227" stroke="none" />
            <circle cx="755" cy="40" r="2" fill="#C9A227" stroke="none" />
          </g>
        </svg>
      </div>
    </article>
  );
}
