"use client";

import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

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

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAll();
        }}
        className="relative rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm font-medium"
        aria-label="Notifications"
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          <div className="border-b border-line px-3 py-2 text-sm font-semibold">Notifications</div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">All clear</li>
            )}
            {items.map((n) => (
              <li key={n.id} className="border-b border-line/70 px-3 py-3 text-sm last:border-0">
                <p className="font-medium text-ink">{n.message}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{n.type}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
