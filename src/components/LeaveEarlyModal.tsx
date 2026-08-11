"use client";

import { useState } from "react";
import type { Shift } from "./ShiftCalendar";

export function LeaveEarlyModal({
  shift,
  onClose,
  onDone,
}: {
  shift: Shift;
  onClose: () => void;
  onDone: () => void;
}) {
  const [leaveAt, setLeaveAt] = useState(shift.startTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: shift.id, leaveAt, isEmergency: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-xl animate-rise">
        {!done ? (
          <>
            <h2 className="font-display text-xl">Need cover?</h2>
            <p className="mt-1 text-sm text-muted">
              The team gets an in-app alert. The manager will WhatsApp everyone from the
              shop number.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              I need to leave at
              <input
                type="time"
                value={leaveAt}
                min={shift.startTime}
                max={shift.endTime}
                onChange={(e) => setLeaveAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-3 text-base"
              />
            </label>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-line px-3 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="flex-1 rounded-xl bg-accent px-3 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Sending…" : "Request coverage"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl">Request sent</h2>
            <p className="mt-2 text-sm text-muted">
              Everyone was alerted in the app. The manager will send WhatsApp from the
              shop number so the team can pick up coverage.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-5 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white"
            >
              Back to schedule
            </button>
          </>
        )}
      </div>
    </div>
  );
}
