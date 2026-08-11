# Corner Shop · Shift Scheduler

Mobile-first shift calendar and coverage alert app for a small retail shop with student part-timers.

Built from `shop-scheduler-cursor-prompt.md`.

## What it does

- Shared weekly schedule (confirmed / needs coverage / open)
- Email + PIN login (admin & employee roles)
- Employee availability profiles
- Admin shift assignment + staff management
- **Leave early** flow: 2 taps → broadcast to eligible candidates → first accept wins
- Auto-escalation to managers when nobody is available / request expires
- In-app notification bell (PWA-ready manifest)

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (local) — swap `DATABASE_URL` to Postgres for production
- Session cookie auth (HMAC + bcrypt PIN)

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo logins** (PIN `1234`):

| Email | Role |
|---|---|
| `manager@shop.local` | Manager (admin) |
| `employee1@shop.local` | Employee 1 |
| `employee2@shop.local` | Employee 2 |
| `employee3@shop.local` | Employee 3 |

## Live links

- **GitHub**: [github.com/gvarun20/shop-time-scheduler](https://github.com/gvarun20/shop-time-scheduler)
- **Vercel**: [shop-time-scheduler.vercel.app](https://shop-time-scheduler.vercel.app)

> Production needs a hosted Postgres `DATABASE_URL` + `AUTH_SECRET` in the Vercel project env (SQLite is for local only).

CI workflow template lives at `docs/github-ci.yml` (move to `.github/workflows/ci.yml` after granting the GitHub `workflow` OAuth scope).

## Deploy on Vercel

1. Import the repo in [Vercel](https://vercel.com/new) → select `gvarun20/shop-time-scheduler`.
2. Create a free Postgres database (Neon, Supabase, or Vercel Postgres).
3. Set environment variables in Vercel:
   - `DATABASE_URL` — Postgres connection string
   - `AUTH_SECRET` — long random string
4. Change `prisma/schema.prisma` datasource `provider` to `postgresql` for production.
5. In Vercel build settings, ensure install/build run `prisma generate` (included in `npm run build`).
6. After first deploy, run `npx prisma db push` + `npm run db:seed` against the prod `DATABASE_URL`.

## Project map

- `src/app/api/*` — auth, shifts, coverage, availability, notifications, users, settings
- `src/lib/coverage.ts` — candidate matching + assignment rules
- `src/components/ShiftCalendar.tsx` — home board + leave-early CTA
- `prisma/schema.prisma` — data model from the brief
