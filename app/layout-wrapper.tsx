"use client";

import { usePathname } from "next/navigation";
import AppLayout from "@/components/layout";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}
