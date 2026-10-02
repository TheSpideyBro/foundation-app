"use client";

import { useEffect, useRef } from "react";

type ModalProps = {
  /** Whether the modal is visible. Renders nothing when false. */
  open: boolean;
  /** Called on Escape, backdrop click, or close-button press. */
  onClose: () => void;
  /** Accessible name for the dialog (Bengali). */
  label: string;
  /** Panel sizing/positioning. Defaults to a centered medium card. */
  panelClassName?: string;
  children: React.ReactNode;
};

/**
 * Shared accessible modal — Escape closes it, Tab cycles inside it
 * (focus trap), and focus returns to the trigger on close. Backdrop
 * click also closes. Modeled on the joma confirm-dialog pattern
 * (app/joma/page.tsx) so every modal in the app behaves the same.
 *
 * Usage:
 *   <Modal open={isOpen} onClose={() => setIsOpen(false)} label="...">
 *     ...header + body...
 *   </Modal>
 */
export default function Modal({
  open,
  onClose,
  label,
  panelClassName = "w-full max-w-lg",
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Lock body scroll while the modal is open (same as the mobile drawer).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [open ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative bg-white rounded-[2rem] shadow-2xl overflow-hidden ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
