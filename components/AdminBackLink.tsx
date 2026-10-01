import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Consistent back-link to /admin for admin sub-pages.
 * Mirrors the inline pattern already used on bulk / pending / categories / notices.
 */
export default function AdminBackLink() {
  return (
    <Link
      href="/admin"
      className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
      aria-label="অ্যাডমিনে ফিরে যান"
    >
      <ArrowLeft size={24} />
    </Link>
  );
}
