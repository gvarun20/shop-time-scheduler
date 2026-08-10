"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("maya@shop.local");
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
    <div className="relative flex min-h-screen items-stretch">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(10,79,68,0.88), rgba(20,32,28,0.55)), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80')",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col justify-end px-5 pb-10 pt-16 sm:justify-center">
        <div className="animate-rise rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
          <p className="font-display text-4xl leading-none text-brand-deep">Corner Shop</p>
          <p className="mt-3 text-base text-muted">
            Shared shifts. Instant cover when someone has to leave early.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-3"
              />
            </label>
            <label className="block text-sm font-semibold">
              PIN
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-3"
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
            Demo: admin@shop.local or maya@shop.local · PIN 1234
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
