import Image from "next/image";
import { BadgeCheck, Landmark, MapPin, Phone } from "lucide-react";

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

/** Premium paper receipt — pure presentational, used by the live page and the dev preview. */
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
      label: "মাধ্যম",
      value: (
        <span className="inline-block rounded-full border border-[#C9A227]/50 bg-[#C9A227]/10 px-3 py-0.5 text-[13px] font-bold text-[#7a5f14]">
          {methodLabel}
        </span>
      ),
    },
    { label: "আদায়কারী", value: collectorName },
    ...(extraAmountLabel ? [{ label: "অতিরিক্ত জমা", value: extraAmountLabel }] : []),
  ];

  const signatureBlock = (
    <div className="flex flex-col justify-center px-2 text-center">
      <p className="-mb-4 font-galada text-[26px] leading-tight text-[#022C22]">{collectorName}</p>
      <div className="border-b border-stone-400/70 pb-6" aria-hidden="true" />
      <p className="mt-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone-500">
        আদায়কারীর স্বাক্ষর
      </p>
    </div>
  );

  return (
    <article className="receipt-paper relative mx-auto w-full max-w-2xl bg-[#FDFCF7] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
      {/* brand band */}
      <div className="h-1.5 bg-gradient-to-r from-[#022C22] via-[#064E3B] to-[#022C22]" aria-hidden="true" />
      {/* hairline frame */}
      <div className="pointer-events-none absolute inset-2.5 border border-[#C9A227]/60" aria-hidden="true" />

      <div className="relative px-6 pb-6 pt-6 sm:px-10">
        {/* masthead */}
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#064E3B] shadow-[0_10px_25px_rgba(6,78,59,0.35)] ring-1 ring-[#C9A227] ring-offset-2 ring-offset-[#FDFCF7]">
            <Landmark size={22} className="text-[#C9A227]" strokeWidth={1.8} />
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9A227]">
            দান রসিদ
          </p>
          <h1 className="mx-auto mt-1 max-w-md font-sabbir text-[23px] font-bold leading-snug text-[#022C22] sm:text-[26px]">
            দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন
          </h1>
          <p className="mx-auto mt-1.5 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] font-medium text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-[#C9A227]" />
              দৌলখাঁড় পূর্বপাড়া, নাঙ্গলকোট, কুমিল্লা
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone size={12} className="shrink-0 text-[#C9A227]" />
              <span className="font-semibold tracking-[0.06em]">০১৮৪০-৮২৮০১০ · ০১৮১৪-৯৪৮২২৪</span>
            </span>
          </p>
          <div className="mx-auto mt-3 flex max-w-[200px] items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#C9A227]" />
            <span className="text-[10px] text-[#C9A227]">✦</span>
            <span className="h-px flex-1 bg-[#C9A227]" />
          </div>
        </header>

        {/* meta band */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 border-y border-[#022C22]/10 bg-[#064E3B]/[0.04] px-4 py-2">
          <div className="flex items-baseline gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone-500">
              রসিদ নং
            </span>
            <span className="font-mono text-[15px] font-bold tracking-[0.08em] text-[#022C22]">
              {receiptNo || "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone-500">
              তারিখ
            </span>
            <span className="text-[15px] font-bold text-[#022C22]">{dateLabel}</span>
          </div>
        </div>

        {/* amount hero — editorial, on paper */}
        <div className="mt-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
            সর্বমোট প্রাপ্তি
          </p>
          <div className="mx-auto mt-2 max-w-[260px] border-y-2 border-[#C9A227] py-2.5">
            <p className="font-baloo text-[42px] font-bold leading-none text-[#064E3B] sm:text-[50px]">
              {amountLabel}
            </p>
          </div>
          <p className="mx-auto mt-2.5 max-w-md font-tiro text-[14.5px] italic leading-relaxed text-stone-600">
            কথায়: {amountWords} টাকা মাত্র
          </p>
        </div>

        {/* details */}
        <dl className="mx-auto mt-5 max-w-lg font-anek">
          {detailRows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6 border-b border-stone-200/80 py-2 last:border-0"
            >
              <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                {label}
              </dt>
              <dd className="text-right text-[15px] font-semibold text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>

        {/* gratitude */}
        <div className="mt-5 text-center">
          <p className="font-galada text-[24px] leading-snug text-[#064E3B]">জাযাকাল্লাহু খাইরান</p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-stone-500">
            আপনার মহানুভবতার জন্য আন্তরিক ধন্যবাদ — আল্লাহ তায়ালা আপনার দান কবুল করুন
          </p>
        </div>

        {/* verify + signature side by side */}
        {verifyUrl ? (
          <div className="mx-auto mt-5 grid max-w-lg grid-cols-1 gap-5 min-[420px]:grid-cols-2">
            <div className="rounded-lg border border-[#022C22]/10 bg-white p-4 text-center shadow-[0_10px_30px_rgba(2,44,34,0.07)]">
              <div className="mx-auto w-fit rounded-md bg-white p-1.5 shadow-[0_6px_18px_rgba(6,78,59,0.12)] ring-1 ring-[#C9A227]/70">
                <Image
                  src={`/api/qr?text=${encodeURIComponent(verifyUrl)}`}
                  alt="রসিদ যাচাই QR কোড"
                  width={88}
                  height={88}
                  className="h-[88px] w-[88px]"
                  unoptimized
                />
              </div>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#064E3B]">
                <BadgeCheck size={15} className="shrink-0 text-[#C9A227]" />
                স্ক্যান করে যাচাই করুন
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                এই QR স্ক্যান করলে রসিদের সত্যতা যাচাই করা যাবে
              </p>
            </div>
            {signatureBlock}
          </div>
        ) : (
          <div className="mx-auto mt-5 max-w-xs">{signatureBlock}</div>
        )}

        <p className="mt-5 text-center text-[10.5px] tracking-[0.08em] text-stone-400">
          সিস্টেম কর্তৃক স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত রসিদ
        </p>
      </div>

      {/* brand band */}
      <div className="h-1.5 bg-gradient-to-r from-[#022C22] via-[#064E3B] to-[#022C22]" aria-hidden="true" />
    </article>
  );
}
