"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { NotificationBell } from "./NotificationBell";

const links = [
  { href: "/app", label: "Schedule" },
  { href: "/app/availability", label: "Availability" },
  { href: "/app/coverage", label: "Coverage" },
  { href: "/app/admin", label: "Manager", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-3 sm:px-6">
      <header className="sticky top-0 z-40 -mx-4 mb-4 border-b border-line/70 bg-[#f7fbf8]/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm">
                N
              </span>
              <div>
                <p className="font-display text-2xl leading-none tracking-tight text-brand-deep sm:text-[1.75rem]">
                  Ngroceries
                </p>
                <p className="mt-1 truncate text-sm text-muted">
                  {user
                    ? `${user.name} · ${user.role === "ADMIN" ? "Manager" : "Team member"}`
                    : "Shift desk"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1 shadow-sm">
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
                      ? "bg-brand text-white shadow-sm"
                      : "text-muted hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
        </nav>
      </header>

      <main className="animate-rise flex-1">{children}</main>
    </div>
  );
}
