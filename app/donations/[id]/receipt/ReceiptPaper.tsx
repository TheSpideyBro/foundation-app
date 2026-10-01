import Image from "next/image";
import { BadgeCheck, Landmark } from "lucide-react";

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

  return (
    <article className="receipt-paper relative mx-auto w-full max-w-2xl bg-[#FDFCF7] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
      {/* brand band */}
      <div className="h-2 bg-gradient-to-r from-[#022C22] via-[#064E3B] to-[#022C22]" aria-hidden="true" />
      {/* hairline frame */}
      <div className="pointer-events-none absolute inset-3 border border-[#C9A227]/60" aria-hidden="true" />

      <div className="relative px-8 pb-12 pt-10 sm:px-12">
        {/* masthead */}
        <header className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#064E3B] shadow-[0_10px_25px_rgba(6,78,59,0.35)] ring-1 ring-[#C9A227] ring-offset-4 ring-offset-[#FDFCF7]">
            <Landmark size={26} className="text-[#C9A227]" strokeWidth={1.8} />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.42em] text-[#C9A227]">
            দান রসিদ
          </p>
          <h1 className="mx-auto mt-2 max-w-md font-tiro text-[27px] font-bold leading-snug text-[#022C22] sm:text-[31px]">
            দৌলখাঁড় পূর্বপাড়া হিলফুল ফুযুল ফাউন্ডেশন
          </h1>
          <div className="mx-auto mt-5 flex max-w-[240px] items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#C9A227]" />
            <span className="text-[10px] text-[#C9A227]">✦</span>
            <span className="h-px flex-1 bg-[#C9A227]" />
          </div>
        </header>

        {/* meta band */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-[#022C22]/10 bg-[#064E3B]/[0.04] px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-stone-500">
              রসিদ নং
            </span>
            <span className="font-mono text-[15px] font-bold tracking-[0.08em] text-[#022C22]">
              {receiptNo || "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-stone-500">
              তারিখ
            </span>
            <span className="text-[15px] font-bold text-[#022C22]">{dateLabel}</span>
          </div>
        </div>

        {/* amount hero — editorial, on paper */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-stone-500">
            সর্বমোট প্রাপ্তি
          </p>
          <div className="mx-auto mt-3 max-w-[300px] border-y-2 border-[#C9A227] py-4">
            <p className="font-tiro text-[54px] font-bold leading-none text-[#064E3B] sm:text-[64px]">
              {amountLabel}
            </p>
          </div>
          <p className="mx-auto mt-4 max-w-md font-tiro text-[16.5px] italic leading-relaxed text-stone-600">
            কথায়: {amountWords} টাকা মাত্র
          </p>
        </div>

        {/* details */}
        <dl className="mx-auto mt-8 max-w-lg">
          {detailRows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6 border-b border-stone-200/80 py-3.5 last:border-0"
            >
              <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
                {label}
              </dt>
              <dd className="text-right text-[16.5px] font-semibold text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>

        {/* verify card */}
        {verifyUrl && (
          <div className="mx-auto mt-8 flex max-w-lg items-center gap-5 rounded-lg border border-[#022C22]/10 bg-white p-5 shadow-[0_10px_30px_rgba(2,44,34,0.07)]">
            <div className="shrink-0 rounded-md bg-white p-1.5 shadow-[0_6px_18px_rgba(6,78,59,0.12)] ring-1 ring-[#C9A227]/70">
              <Image
                src={`/api/qr?text=${encodeURIComponent(verifyUrl)}`}
                alt="রসিদ যাচাই QR কোড"
                width={104}
                height={104}
                className="h-[104px] w-[104px]"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[15px] font-bold text-[#064E3B]">
                <BadgeCheck size={17} className="shrink-0 text-[#C9A227]" />
                স্ক্যান করে যাচাই করুন
              </p>
              <p className="mt-1.5 break-all font-mono text-[11.5px] leading-relaxed text-stone-500">
                {verifyUrl.replace(/^https?:\/\//, "")}
              </p>
              <p className="mt-1 text-[12px] text-stone-500">
                এই QR স্ক্যান করলে রসিদের সত্যতা যাচাই করা যাবে
              </p>
            </div>
          </div>
        )}

        {/* gratitude */}
        <div className="mt-10 text-center">
          <p className="font-tiro text-[24px] font-bold text-[#064E3B]">জাযাকাল্লাহু খাইরান</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-stone-500">
            আপনার মহানুভবতার জন্য আন্তরিক ধন্যবাদ — আল্লাহ তায়ালা আপনার দান কবুল করুন
          </p>
        </div>

        {/* signatures */}
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-10">
          <div className="text-center">
            <div className="border-b border-stone-400/70 pb-8" aria-hidden="true" />
            <p className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-stone-500">
              আদায়কারীর স্বাক্ষর
            </p>
            <p className="mt-1 text-[13px] font-semibold text-stone-700">{collectorName}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-stone-400/70 pb-8" aria-hidden="true" />
            <p className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-stone-500">
              অফিস সিল
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[10.5px] tracking-[0.08em] text-stone-400">
          সিস্টেম কর্তৃক স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত রসিদ
        </p>
      </div>

      {/* brand band */}
      <div className="h-2 bg-gradient-to-r from-[#022C22] via-[#064E3B] to-[#022C22]" aria-hidden="true" />
    </article>
  );
}
