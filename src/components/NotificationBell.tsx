"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const typeLabel: Record<string, string> = {
  COVERAGE_ALERT: "Coverage",
  SCHEDULE_UPDATE: "Schedule",
  ESCALATION: "Urgent",
  REMINDER: "Reminder",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications || []);
    setUnread(data.unread || 0);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelPos({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  };

  const toggle = () => {
    if (!open) {
      placePanel();
      markAll();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onResize = () => placePanel();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  const panel =
    open &&
    mounted &&
    createPortal(
      <>
        <button
          type="button"
          aria-label="Close alerts"
          className="animate-fade fixed inset-0 z-[90] cursor-default bg-ink/20"
          onClick={() => setOpen(false)}
        />
        <div
          className="animate-rise fixed z-[100] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
          style={{ top: panelPos.top, right: panelPos.right }}
          role="dialog"
          aria-label="Alerts"
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-soft px-4 py-3">
            <p className="text-sm font-bold text-ink">Alerts</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">No alerts right now</li>
            )}
            {items.map((n) => (
              <li key={n.id} className="border-b border-line/70 px-4 py-3 last:border-0">
                <p className="text-sm font-medium leading-snug text-ink">{n.message}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-deep">
                    {typeLabel[n.type] || n.type}
                  </span>
                  <span className="text-[11px] text-muted">
                    {new Date(n.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </>,
      document.body,
    );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="relative rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/40"
        aria-label="Notifications"
        aria-expanded={open}
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
