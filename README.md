# Ngroceries · Shift Scheduler

Mobile-first shift calendar and coverage alert app for **Ngroceries** staff.

Built from `shop-scheduler-cursor-prompt.md`.

## What it does

- Shared weekly schedule (confirmed / needs coverage / open)
- Email + PIN login (admin & employee roles)
- Employee availability profiles
- Admin shift assignment + staff management
- **Leave early** flow: 2 taps → WhatsApp + in-app broadcast to all staff → first accept wins
- WhatsApp alerts (Twilio): 2h shift reminders, coverage needed, coverage accepted
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

> Production needs `DATABASE_URL`, `AUTH_SECRET`, and for live WhatsApp: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`. Optional: `CRON_SECRET`, `SHOP_UTC_OFFSET`.

### WhatsApp setup (Twilio)

1. Create a Twilio account and enable WhatsApp (sandbox is fine for testing).
2. In Vercel → Project → Settings → Environment Variables, add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`)
3. Put real WhatsApp numbers on each user (E.164 like `+31612345678`) in Manager → Add employee / Team.
4. Cron runs every 15 minutes at `/api/cron/reminders` and texts staff ~2 hours before their shift.

Until Twilio is configured, messages are logged as dry-run on the Manager → WhatsApp alerts panel.

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
