"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
};

type Availability = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isException: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  availabilities: Availability[];
};

type HoursRow = {
  userId: string;
  name: string;
  email: string;
  shiftCount: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("18:00");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("1234");

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [hoursReport, setHoursReport] = useState<HoursRow[]>([]);
  const [hoursTotals, setHoursTotals] = useState({
    regularHours: 0,
    overtimeHours: 0,
    totalHours: 0,
    shiftCount: 0,
  });
  const [waConfigured, setWaConfigured] = useState(false);
  const [waMessages, setWaMessages] = useState<
    { id: string; toPhone: string; body: string; status: string; error: string | null; createdAt: string }[]
  >([]);

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/app");
  }, [user, router]);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) {
      const list = (data.users || []) as User[];
      setUsers(list);
      if (!assignedUserId) {
        const firstEmployee = list.find((u) => u.role === "EMPLOYEE");
        if (firstEmployee) setAssignedUserId(firstEmployee.id);
      }
    }
  }, [assignedUserId]);

  const loadTeamAvailability = useCallback(async () => {
    const res = await fetch("/api/availability?all=1");
    const data = await res.json();
    if (res.ok) setTeam(data.team || []);
  }, []);

  const loadHours = useCallback(async () => {
    const res = await fetch(`/api/hours?month=${month}`);
    const data = await res.json();
    if (res.ok) {
      setHoursReport(data.report || []);
      setHoursTotals(
        data.totals || {
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          shiftCount: 0,
        },
      );
    }
  }, [month]);

  const loadWhatsApp = useCallback(async () => {
    const res = await fetch("/api/whatsapp");
    const data = await res.json();
    if (res.ok) {
      setWaConfigured(Boolean(data.configured));
      setWaMessages(data.messages || []);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadTeamAvailability();
    loadWhatsApp();
  }, [loadUsers, loadTeamAvailability, loadWhatsApp]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const createShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        startTime,
        endTime,
        assignedUserId: assignedUserId || null,
        isOvertime,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else {
      setMessage(isOvertime ? "Overtime shift published." : "Shift created and team notified.");
      loadHours();
    }
  };

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        phone: newPhone || undefined,
        pin: newPin,
        role: "EMPLOYEE",
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else {
      setMessage(`Added ${data.user.name}`);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      loadUsers();
      loadTeamAvailability();
      loadHours();
    }
  };

  const deleteEmployee = async (employee: User) => {
    if (employee.role !== "EMPLOYEE") return;
    const ok = window.confirm(
      `Remove ${employee.name} from the team?\nTheir shifts will become unassigned.`,
    );
    if (!ok) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/users/${employee.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not delete employee");
      return;
    }
    setMessage(`${employee.name} was removed.`);
    if (assignedUserId === employee.id) setAssignedUserId("");
    loadUsers();
    loadTeamAvailability();
    loadHours();
  };

  if (user?.role !== "ADMIN") return null;

  const employees = users.filter((u) => u.role === "EMPLOYEE");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Manager desk</h1>
        <p className="text-sm text-muted">
          Assign shifts, review team availability, and track monthly hours.
        </p>
      </div>

      {message && (
        <p className="rounded-xl border border-ok/20 bg-ok/10 px-3 py-2 text-sm text-ok">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">Monthly hours</h2>
            <p className="text-sm text-muted">Hours each employee worked in the selected month.</p>
          </div>
          <label className="text-sm font-semibold">
            Month
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 block rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total hours</p>
            <p className="mt-1 font-display text-2xl text-brand-deep">{hoursTotals.totalHours}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Regular</p>
            <p className="mt-1 font-display text-2xl text-ink">{hoursTotals.regularHours}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Overtime</p>
            <p className="mt-1 font-display text-2xl text-accent">{hoursTotals.overtimeHours}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Employee</th>
                <th className="px-3 py-2 font-semibold">Shifts</th>
                <th className="px-3 py-2 font-semibold">Regular</th>
                <th className="px-3 py-2 font-semibold">OT</th>
                <th className="px-3 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {hoursReport.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No employees yet
                  </td>
                </tr>
              )}
              {hoursReport.map((row) => (
                <tr key={row.userId} className="border-t border-line">
                  <td className="px-3 py-2.5 font-medium text-ink">{row.name}</td>
                  <td className="px-3 py-2.5 text-muted">{row.shiftCount}</td>
                  <td className="px-3 py-2.5">{row.regularHours}h</td>
                  <td className="px-3 py-2.5 text-accent">{row.overtimeHours}h</td>
                  <td className="px-3 py-2.5 font-bold text-brand-deep">{row.totalHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-display text-lg">Team availability</h2>
          <p className="text-sm text-muted">
            See when every employee says they can work before you assign shifts.
          </p>
        </div>
        <div className="grid gap-3">
          {team.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
              No employee availability yet
            </p>
          )}
          {team.map((member) => (
            <article key={member.id} className="rounded-xl border border-line bg-bg px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-ink">{member.name}</h3>
                <span className="text-xs text-muted">{member.email}</span>
              </div>
              {member.availabilities.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No availability set</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {member.availabilities.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        a.isException
                          ? "border-danger/30 bg-danger/10 text-danger"
                          : "border-brand/20 bg-white text-brand-deep"
                      }`}
                    >
                      {a.isException ? "Off" : DAYS[a.dayOfWeek]} · {a.startTime}–{a.endTime}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <form onSubmit={createShift} className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-display text-lg">Assign shift</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-semibold">
            Employee
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            >
              <option value="">Open / unassigned</option>
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Start
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-semibold">
            End
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isOvertime}
            onChange={(e) => setIsOvertime(e.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Overtime (allowed after shop closing)
        </label>
        <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">
          Publish shift
        </button>
      </form>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">WhatsApp alerts</h2>
            <p className="text-sm text-muted">
              2h shift reminders, leave-early broadcasts, and coverage accept notices.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              waConfigured
                ? "bg-ok/15 text-ok"
                : "bg-warn/15 text-warn"
            }`}
          >
            {waConfigured ? "Twilio connected" : "Not configured (dry-run log)"}
          </span>
        </div>
        {!waConfigured && (
          <p className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in Vercel env to send real WhatsApp messages.
          </p>
        )}
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {waMessages.length === 0 && (
            <li className="py-6 text-center text-sm text-muted">No WhatsApp messages yet</li>
          )}
          {waMessages.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-bg px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">{m.toPhone}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {m.status}
                </span>
              </div>
              <p className="mt-1 text-muted">{m.body}</p>
              {m.error && <p className="mt-1 text-xs text-danger">{m.error}</p>}
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={addEmployee} className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-display text-lg">Add employee</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-semibold">
            WhatsApp number
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+31612345678"
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-semibold">
            Email
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-semibold">
            PIN
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
              minLength={4}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
            />
          </label>
        </div>
        <button type="submit" className="rounded-xl border border-brand px-4 py-2.5 text-sm font-bold text-brand">
          Add to team
        </button>
      </form>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-display text-lg">Team</h2>
        <ul className="mt-3 divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink">{u.name}</p>
                <p className="truncate text-muted">
                  {u.email}
                  {u.phone ? ` · WhatsApp ${u.phone}` : " · no WhatsApp"}
                  {` · ${u.role === "ADMIN" ? "Manager" : "Employee"}`}
                </p>
              </div>
              {u.role === "EMPLOYEE" && (
                <button
                  type="button"
                  onClick={() => deleteEmployee(u)}
                  className="shrink-0 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
