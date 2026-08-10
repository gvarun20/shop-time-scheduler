"use client";

import { format, addDays, startOfWeek } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { LeaveEarlyModal } from "./LeaveEarlyModal";

export type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "OPEN" | "NEEDS_COVERAGE";
  notes?: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  coverageRequests?: { id: string; uncoveredStart: string; uncoveredEnd: string }[];
};

const statusStyle: Record<Shift["status"], string> = {
  CONFIRMED: "border-ok/30 bg-ok/10 text-ok",
  NEEDS_COVERAGE: "border-warn/40 bg-warn/10 text-warn animate-pulse-soft",
  OPEN: "border-danger/30 bg-danger/10 text-danger",
};

export function ShiftCalendar() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveShift, setLeaveShift] = useState<Shift | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 7), "yyyy-MM-dd");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/shifts?from=${from}&to=${to}`);
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed to load");
    else {
      setShifts(data.shifts || []);
      setError(null);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Week schedule</h1>
          <p className="text-sm text-muted">Everyone sees the same board — no more word of mouth.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-ok" /> Confirmed</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-warn" /> Needs coverage</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-danger" /> Open</span>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading schedule…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter(
              (s) => format(new Date(s.date), "yyyy-MM-dd") === key,
            );
            return (
              <section
                key={key}
                className="rounded-2xl border border-line bg-bg-elevated/90 p-3 shadow-sm"
              >
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-lg">{format(day, "EEE")}</h2>
                  <span className="text-xs text-muted">{format(day, "MMM d")}</span>
                </header>
                <div className="space-y-2">
                  {dayShifts.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted">No shifts</p>
                  )}
                  {dayShifts.map((s) => {
                    const mine = s.assignedUser?.id === user?.id;
                    return (
                      <article
                        key={s.id}
                        className={`rounded-xl border px-3 py-2 ${statusStyle[s.status]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-ink">
                              {s.startTime} – {s.endTime}
                            </p>
                            <p className="text-sm">
                              {s.assignedUser?.name || "Unassigned"}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {s.status.replace("_", " ")}
                          </span>
                        </div>
                        {mine && s.status !== "NEEDS_COVERAGE" && (
                          <button
                            type="button"
                            onClick={() => setLeaveShift(s)}
                            className="mt-2 w-full rounded-lg bg-accent px-2 py-2 text-xs font-bold text-white"
                          >
                            I need to leave early
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {leaveShift && (
        <LeaveEarlyModal
          shift={leaveShift}
          onClose={() => setLeaveShift(null)}
          onDone={() => {
            setLeaveShift(null);
            load();
          }}
        />
      )}
    </div>
  );
}
