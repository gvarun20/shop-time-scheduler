"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  phone?: string | null;
  maxHoursPerWeek?: number;
};

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, pin: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth");
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, pin: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    setUser(data.user);
    return null;
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
