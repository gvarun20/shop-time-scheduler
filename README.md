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
| `admin@shop.local` | Manager |
| `maya@shop.local` | Employee |
| `jordan@shop.local` | Employee |
| `sam@shop.local` | Employee |
| `riley@shop.local` | Employee |

## Deploy on GitHub + Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Create a free Postgres database (Neon, Supabase, or Vercel Postgres).
4. Set environment variables in Vercel:
   - `DATABASE_URL` — Postgres connection string
   - `AUTH_SECRET` — long random string
5. Update `prisma/schema.prisma` datasource provider to `postgresql` (or keep SQLite only for local demos).
6. Run migrations against production: `npx prisma db push` with the prod URL, then seed if desired.
7. Redeploy.

GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint/build on pull requests.

## Project map

- `src/app/api/*` — auth, shifts, coverage, availability, notifications, users, settings
- `src/lib/coverage.ts` — candidate matching + assignment rules
- `src/components/ShiftCalendar.tsx` — home board + leave-early CTA
- `prisma/schema.prisma` — data model from the brief
