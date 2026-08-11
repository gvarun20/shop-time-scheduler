"use client";

import { format } from "date-fns";
import { useState } from "react";

export function OvertimeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("22:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startTime, endTime, notes: notes || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save overtime");
      return;
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="animate-rise w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-2xl"
      >
        <h2 className="font-display text-xl text-ink">Log overtime</h2>
        <p className="mt-1 text-sm text-muted">
          Use this when you worked after shop closing (stocking, late customers, cleanup).
          Managers get an alert automatically.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">
              From
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold">
              To
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
              />
            </label>
          </div>
          <label className="text-sm font-semibold">
            Why (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Restock after delivery"
              maxLength={300}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line px-3 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-accent px-3 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save overtime"}
          </button>
        </div>
      </form>
    </div>
  );
}
