"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("manager@shop.local");
  const [pin, setPin] = useState("1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await login(email, pin);
    setBusy(false);
    if (err) setError(err);
    else router.replace("/app");
  };

  return (
    <div className="relative flex min-h-screen items-stretch overflow-hidden">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(15,82,51,0.92) 0%, rgba(18,36,28,0.55) 48%, rgba(239,108,47,0.28) 100%), url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80')",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/25 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col justify-between px-5 pb-10 pt-10 sm:justify-center sm:py-16">
        <div className="animate-rise mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-deep">
              N
            </span>
            <span className="text-sm font-semibold text-white">Staff shifts</span>
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] text-white sm:text-6xl">
            Ngroceries
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
            One shared schedule. Instant cover when someone needs to leave early.
          </p>
        </div>

        <div className="animate-rise rounded-[1.75rem] border border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <p className="text-sm font-semibold text-brand-deep">Sign in to the schedule</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-ink">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-3 outline-none ring-brand/30 focus:ring-2"
              />
            </label>
            <label className="block text-sm font-semibold text-ink">
              PIN
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-3 outline-none ring-brand/30 focus:ring-2"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Open schedule"}
            </button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Demo PIN 1234 · manager@shop.local · employee1@shop.local ·
            employee2@shop.local · employee3@shop.local
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
