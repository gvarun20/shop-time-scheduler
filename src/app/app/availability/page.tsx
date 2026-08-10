"use client";

import { useCallback, useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Availability = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isException: boolean;
  specificDate: string | null;
};

export default function AvailabilityPage() {
  const [rows, setRows] = useState<Availability[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("21:00");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/availability");
    const data = await res.json();
    if (res.ok) setRows(data.availabilities || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startTime, endTime, isRecurring: true }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">My availability</h1>
        <p className="text-sm text-muted">Managers use this when building the roster and matching cover.</p>
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold">
          Day
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          From
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
          />
        </label>
        <label className="text-sm font-semibold">
          To
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
          />
        </label>
        <button type="submit" className="self-end rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white">
          Add block
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-line bg-bg-elevated px-3 py-3"
          >
            <span className="text-sm font-medium">
              {DAYS[r.dayOfWeek]} · {r.startTime}–{r.endTime}
              {r.isException ? " (exception)" : ""}
            </span>
            <button
              type="button"
              onClick={() => remove(r.id)}
              className="text-sm font-semibold text-danger"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
