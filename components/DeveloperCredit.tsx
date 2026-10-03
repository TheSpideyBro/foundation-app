"use client";

import { Code2 } from "lucide-react";

type Props = {
  variant?: "light" | "dark" | "subtle";
  className?: string;
};

/**
 * Developer credit — "Developed by Saddam Hossain Akash".
 * Eye-catching but tasteful. Use on login, footers, profile.
 */
export default function DeveloperCredit({ variant = "subtle", className = "" }: Props) {
  if (variant === "light") {
    return (
      <div className={`flex items-center justify-center gap-1.5 ${className}`}>
        <Code2 size={13} className="text-emerald-300" />
        <p className="text-[11px] font-bold text-white/80">
          Developed by{" "}
          <span className="text-white font-extrabold">Saddam Hossain Akash</span>
        </p>
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className={`flex items-center justify-center gap-1.5 ${className}`}>
        <span className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center">
          <Code2 size={13} className="text-white" />
        </span>
        <p className="text-[11px] font-bold text-gray-500">
          Developed by{" "}
          <span className="text-emerald-700 font-extrabold">Saddam Hossain Akash</span>
        </p>
      </div>
    );
  }

  // subtle (default) — for sidebars and tight spaces
  return (
    <p className={`text-[10px] font-bold text-gray-400 text-center ${className}`}>
      Developed by <span className="text-emerald-600">Saddam Hossain Akash</span>
    </p>
  );
}
