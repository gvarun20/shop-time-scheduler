"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { NotificationBell } from "./NotificationBell";

const links = [
  { href: "/app", label: "Schedule" },
  { href: "/app/availability", label: "Availability" },
  { href: "/app/coverage", label: "Coverage" },
  { href: "/app/admin", label: "Admin", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-4 sm:px-6">
      <header className="animate-rise mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl tracking-tight text-brand-deep sm:text-3xl">
            Corner Shop
          </p>
          <p className="text-sm text-muted">
            {user ? `${user.name} · ${user.role === "ADMIN" ? "Manager" : "Team"}` : "Shift desk"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm font-medium text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="animate-rise mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-bg-elevated/80 p-1 backdrop-blur">
        {links
          .filter((l) => !l.adminOnly || user?.role === "ADMIN")
          .map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-brand text-white"
                    : "text-muted hover:bg-white hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
      </nav>

      <main className="animate-rise flex-1">{children}</main>
    </div>
  );
}
