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
  const [result, setResult] = useState<{ candidates: { name: string }[] } | null>(null);

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
    setResult({ candidates: data.candidates || [] });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-xl animate-rise">
        {!result ? (
          <>
            <h2 className="font-display text-xl">Need cover?</h2>
            <p className="mt-1 text-sm text-muted">
              We&apos;ll alert everyone available for {leaveAt || "…"}–{shift.endTime}. First accept wins.
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
                {busy ? "Sending…" : "Broadcast alert"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl">Alert sent</h2>
            <p className="mt-2 text-sm text-muted">
              {result.candidates.length === 0
                ? "No candidates matched right now — manager was escalated."
                : `Notified ${result.candidates.length}: ${result.candidates.map((c) => c.name).join(", ")}.`}
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
