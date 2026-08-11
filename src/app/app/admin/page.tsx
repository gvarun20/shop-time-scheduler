"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("18:00");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPin, setNewPin] = useState("1234");

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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else setMessage("Shift created and team notified.");
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
      loadUsers();
    }
  };

  if (user?.role !== "ADMIN") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Manager desk</h1>
        <p className="text-sm text-muted">Create shifts, add staff, keep the Ngroceries board accurate.</p>
      </div>

      {message && (
        <p className="rounded-xl border border-ok/20 bg-ok/10 px-3 py-2 text-sm text-ok">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

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
              {users
                .filter((u) => u.role === "EMPLOYEE")
                .map((u) => (
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
        <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">
          Publish shift
        </button>
      </form>

      <form onSubmit={addEmployee} className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-display text-lg">Add employee</h2>
        <div className="grid gap-3 sm:grid-cols-3">
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
            <li key={u.id} className="flex justify-between py-2 text-sm">
              <span className="font-medium">{u.name}</span>
              <span className="text-muted">
                {u.email} · {u.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
