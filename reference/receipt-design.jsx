import React from "react";
import { Stamp, CheckCircle2 } from "lucide-react";

const C = {
  ink: "#1B4332",
  paper: "#FBF8F1",
  border: "#E4DCC8",
  gold: "#C9972D",
  red: "#A63D40",
  text: "#2B2B26",
  sub: "#8A8371",
};
const bn = { fontFamily: "'Hind Siliguri', sans-serif" };
const serif = { fontFamily: "'Tiro Bangla', serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const methodLabel = { cash: "নগদ", bkash: "বিকাশ", bank: "ব্যাংক" };

export default function Receipt({
  receiptNo = "R-0142",
  donorName = "রফিকুল ইসলাম",
  amount = 5000,
  date = "২২ জুলাই, ২০২৬",
  method = "bkash",
  receivedBy = "আকাশ (কোষাধ্যক্ষ)",
  orgName = "আশ্রয় সংঘ",
} = {}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#EDEAE0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla&family=JetBrains+Mono:wght@500;600&display=swap');`}</style>

      {/* Receipt card — fixed width, mimics a passbook stub, good for image export */}
      <div
        id="receipt-card"
        className="w-[380px] relative overflow-hidden rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.15)]"
        style={{ background: C.paper, ...bn }}
      >
        {/* header strip */}
        <div className="px-6 py-5" style={{ background: C.ink }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.gold }}>
              <Stamp size={15} style={{ color: C.ink }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#F3EFE2]" style={serif}>{orgName}</p>
              <p className="text-[10.5px] text-[#B8CCC0]">দান রসিদ &middot; Donation Receipt</p>
            </div>
          </div>
        </div>
        <div className="h-[4px] w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #C9972D 0 10px, transparent 10px 20px)", opacity: 0.6 }} />

        {/* body */}
        <div className="px-6 py-6 relative">
          {/* perforation dots along left margin, ledger feel */}
          <div className="absolute left-[26px] top-0 bottom-0 w-px" style={{ background: "#D8A0A0" }} />

          <div className="flex items-center justify-between mb-5 pl-6">
            <span className="text-[11px] uppercase tracking-wide" style={{ color: C.sub }}>রসিদ নং</span>
            <span className="text-[13px] font-semibold" style={{ ...mono, color: C.ink }}>{receiptNo}</span>
          </div>

          <div className="pl-6 space-y-4">
            <Row label="প্রদানকারীর নাম" value={donorName} big />
            <Row label="পরিমাণ" value={`৳${amount.toLocaleString("bn-BD")}`} big accent={C.ink} isAmount />
            <Row label="তারিখ" value={date} />
            <Row
              label="মাধ্যম"
              value={
                <span
                  className="text-[11.5px] px-2.5 py-0.5 rounded-full font-medium inline-block"
                  style={{ background: C.gold + "1A", color: C.gold }}
                >
                  {methodLabel[method] || method}
                </span>
              }
            />
            <Row label="গ্রহণকারী" value={receivedBy} />
          </div>

          {/* verified stamp */}
          <div className="mt-6 pl-6 flex items-center gap-1.5 text-[11.5px]" style={{ color: C.ink }}>
            <CheckCircle2 size={14} strokeWidth={2} />
            যাচাইকৃত এন্ট্রি
          </div>
        </div>

        {/* footer tear-line */}
        <div className="px-6 py-3 text-center text-[10px]" style={{ borderTop: `1px dashed ${C.border}`, color: C.sub }}>
          এই রসিদটি {orgName} কর্তৃক ইলেকট্রনিকভাবে জেনারেট করা হয়েছে
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, big, accent, isAmount }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: "#8A8371" }}>{label}</span>
      <span
        className={big ? "text-[16px] font-semibold" : "text-[13.5px] font-medium"}
        style={{ color: accent || "#2B2B26", ...(isAmount ? mono : {}) }}
      >
        {value}
      </span>
    </div>
  );
}
