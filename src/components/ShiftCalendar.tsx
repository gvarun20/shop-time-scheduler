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

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const statusStyle: Record<Shift["status"], string> = {
  CONFIRMED: "border-ok/30 bg-ok/10 text-ok",
  NEEDS_COVERAGE: "border-warn/40 bg-warn/10 text-warn animate-pulse-soft",
  OPEN: "border-danger/30 bg-danger/10 text-danger",
};

export function ShiftCalendar() {
  const { user } = useAuth();
  const isManager = user?.role === "ADMIN";
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveShift, setLeaveShift] = useState<Shift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [composeDay, setComposeDay] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("14:00");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

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

  const loadEmployees = useCallback(async () => {
    if (!isManager) return;
    const res = await fetch("/api/users");
    const data = await res.json();
    if (!res.ok) return;
    const list = ((data.users || []) as Employee[]).filter((u) => u.role === "EMPLOYEE");
    setEmployees(list);
    if (!newEmployeeId && list[0]) setNewEmployeeId(list[0].id);
  }, [isManager, newEmployeeId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const reassign = async (shiftId: string, assignedUserId: string) => {
    setAssigningId(shiftId);
    setError(null);
    const res = await fetch(`/api/shifts/${shiftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedUserId: assignedUserId || null,
      }),
    });
    const data = await res.json();
    setAssigningId(null);
    if (!res.ok) {
      setError(data.error || "Could not assign employee");
      return;
    }
    await load();
  };

  const createShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeDay) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: composeDay,
        startTime: newStart,
        endTime: newEnd,
        assignedUserId: newEmployeeId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create shift");
      return;
    }
    setComposeDay(null);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Ngroceries</p>
          <h1 className="font-display text-3xl text-ink">Week schedule</h1>
          <p className="mt-1 text-sm text-muted">
            {isManager
              ? "Pick a day, choose an employee from the dropdown, and assign the shift."
              : "Everyone sees the same board — no more word of mouth."}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-1 shadow-sm">
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-soft hover:text-ink"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-soft hover:text-ink"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 border border-line"><i className="h-2.5 w-2.5 rounded-full bg-ok" /> Confirmed</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 border border-line"><i className="h-2.5 w-2.5 rounded-full bg-warn" /> Needs coverage</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 border border-line"><i className="h-2.5 w-2.5 rounded-full bg-danger" /> Open</span>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {isManager && composeDay && (
        <form
          onSubmit={createShift}
          className="animate-rise space-y-3 rounded-2xl border border-brand/30 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg">Assign shift · {composeDay}</h2>
            <button
              type="button"
              onClick={() => setComposeDay(null)}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              Employee
              <select
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Start
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold">
              End
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving || !newEmployeeId}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Assign to calendar"}
          </button>
        </form>
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
                className="rounded-2xl border border-line bg-white p-3.5 shadow-sm"
              >
                <header className="mb-3 flex items-center justify-between gap-2 border-b border-line/80 pb-2">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-lg">{format(day, "EEE")}</h2>
                    <span className="text-xs font-medium text-muted">{format(day, "MMM d")}</span>
                  </div>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setComposeDay(key)}
                      className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white shadow-sm"
                    >
                      + Assign
                    </button>
                  )}
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
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-ink">
                              {s.startTime} – {s.endTime}
                            </p>
                            {isManager ? (
                              <label className="mt-1 block text-xs font-semibold text-muted">
                                Assigned to
                                <select
                                  value={s.assignedUser?.id || ""}
                                  disabled={assigningId === s.id}
                                  onChange={(e) => reassign(s.id, e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-medium text-ink"
                                >
                                  <option value="">Unassigned</option>
                                  {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <p className="text-sm">
                                {s.assignedUser?.name || "Unassigned"}
                              </p>
                            )}
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
