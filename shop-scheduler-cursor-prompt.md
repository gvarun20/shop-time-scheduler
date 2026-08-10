# Cursor Build Prompt: Shop Shift Scheduler & Coverage Alert App

Paste everything below into Cursor as your project brief / initial prompt.

---

## Context

Build a simple web app for a small retail shop staffed by student employees who work part-time, rotating shifts. Two real problems it must solve:

1. **Mid-shift coverage gaps** — an employee scheduled for a shift sometimes has to leave early (personal commitment, class, emergency). The shop has fixed open/close hours, so the remaining time until close must be covered by someone else. Right now there is no way to find and notify an available employee quickly.
2. **Word-of-mouth coordination** — shift assignments are currently only communicated verbally, so people forget who is working when, leading to missed shifts and confusion.

The app should replace both with a single shared, always-up-to-date system.

---

## Core Goals

- One shared source of truth for the shift schedule (no more verbal coordination).
- A fast way to flag "I need to leave early / I can't make my shift" and automatically find someone to cover the gap.
- Dead-simple UI — employees are students, not shop-management power users.

---

## User Roles

- **Admin/Manager**: creates shifts, sets store hours, adds/removes employees, approves final schedule, can override assignments.
- **Employee**: views their shifts, sets their own availability, can request early leave / shift drop, can accept open coverage requests.

---

## Feature Requirements

### 1. Shift Calendar
- Weekly/monthly calendar view showing store open/close time and all assigned shifts.
- Each shift shows: employee name, start time, end time, status (confirmed / needs coverage / open).
- Color-code shifts by status (e.g., green = confirmed, orange = partially uncovered, red = unfilled).
- Employees can see the whole shop's schedule, not just their own (transparency reduces "who's working" confusion).

### 2. Employee Availability Profiles
- Each employee sets a **recurring weekly availability** (e.g., "available Mon/Wed 2–8pm, not available Fri").
- Optional: one-off exceptions ("unavailable next Tuesday").
- Admin uses this when building the schedule; app should warn if a shift is assigned outside stated availability.

### 3. Shift Assignment
- Admin assigns employees to shift slots between opening and closing time.
- A shift can be split into sub-blocks (e.g., 10am–2pm, 2pm–6pm, 6pm–9pm) so partial coverage is easy to model.
- Prevent double-booking: an employee can't be assigned two overlapping shifts.
- Enforce fixed store hours: no shift can start before opening or end after closing.

### 4. Early-Leave / Drop-Shift Flow (the core problem)
This is the most important flow — make it as low-friction as possible.

- Employee currently on shift taps **"I need to leave early"** (or "I can't make this shift" for advance notice) and specifies the time they need to leave from.
- App automatically calculates the **uncovered time window** (their leave time → shift end / store close).
- App identifies **candidate employees** who could cover, based on:
  - Marked as available during that time window (from availability profiles), AND
  - Not already scheduled for another shift that overlaps, AND
  - Under any configured max-hours-per-day/week limit, AND
  - (Optional) Excludes anyone who already declined this same request.
- App sends an **alert/broadcast** to all candidates simultaneously ("first to accept wins" model), not a manual one-by-one ask.
- First employee to accept is auto-assigned to the uncovered block; the shift updates in real time for everyone.
- If nobody accepts within a configurable window (e.g., 15–30 min) or nobody is available, escalate: notify the admin/manager directly so they can call someone or cover it themselves.
- Keep a log of who requested coverage, who covered it, and when — useful for fairness and accountability over time.

### 5. Notifications / Alerts
Pick based on what's easiest to ship first, but design so channels are pluggable:

- **Primary (v1, simplest)**: Push notifications via a PWA (installable web app) — no app store needed, works on phones.
- **Fallback options**: SMS (e.g., Twilio) or WhatsApp message for urgent coverage alerts, since students may not always have the tab open.
- **Always-on channel**: in-app notification bell + badge count for less urgent updates (new schedule posted, shift reminder).
- Send a **shift reminder** notification (e.g., 1 hour before shift start) to reduce no-shows.
- Send an **immediate broadcast** for coverage requests to all eligible candidates at once, not sequential DMs.

### 6. Rules & Constraints Engine
Make these configurable, not hardcoded, since shop needs may change:
- Store opening/closing time (per day of week, in case hours differ e.g. weekends).
- Minimum/maximum shift length.
- Minimum notice period for a planned shift drop (vs. emergency early-leave, which bypasses this).
- Max hours per employee per day/week (avoid burnout/overwork, especially for students with classes).
- Minimum gap between two shifts for the same employee (no back-to-back exhausting shifts unless allowed).
- Whether an employee can cover a shift immediately or needs manager approval first (configurable — start with auto-accept for speed, add approval later if needed).

### 7. Simplicity Requirements
- Single shared calendar screen as the home view — no deep menus.
- Coverage request should be doable in **2 taps max** from an active shift.
- Mobile-first responsive design (most usage will be on phones).
- No account complexity — simple login (email/phone + PIN, or a magic link) since this is a small trusted group.

---

## Suggested Tech Stack (adjust to your comfort level)

- **Frontend**: React (or Next.js) with a mobile-first UI; Tailwind for styling.
- **Backend**: Node.js + Express, or Next.js API routes to keep it one codebase.
- **Database**: PostgreSQL (or SQLite for a very small deployment) — tables: `users`, `shifts`, `availability`, `coverage_requests`, `notifications`.
- **Real-time updates**: WebSockets (Socket.io) or a service like Supabase Realtime, so the calendar updates live for everyone when a shift changes.
- **Notifications**: Web Push API for PWA push notifications (free); Twilio for SMS fallback if budget allows.
- **Auth**: Simple session-based auth or magic-link email login (e.g., via Supabase Auth or Auth.js) — avoid heavy OAuth setup for a 5–10 person team.
- **Hosting**: Vercel (frontend/API) + Supabase or Railway (Postgres + realtime) for a fast, low-maintenance deploy.

---

## Data Model (starting point)

```
User
- id, name, phone/email, role (admin/employee), max_hours_per_week

Availability
- id, user_id, day_of_week, start_time, end_time, is_recurring, specific_date (nullable for exceptions)

Shift
- id, date, start_time, end_time, assigned_user_id (nullable if open), status (confirmed/open/needs_coverage)

CoverageRequest
- id, original_shift_id, requested_by_user_id, uncovered_start, uncovered_end, status (open/filled/expired), filled_by_user_id, created_at

Notification
- id, user_id, type (reminder/coverage_alert/schedule_update), message, read, sent_at
```

---

## Build Order (MVP first)

1. Auth + user roles (admin/employee).
2. Store hours config + shift calendar (view only).
3. Admin can create/assign shifts; employees can view their own + full schedule.
4. Availability profiles.
5. Early-leave / drop-shift request flow with candidate matching.
6. Push notification broadcast for coverage requests.
7. Reminder notifications for upcoming shifts.
8. Rules engine (max hours, min notice, no double-booking) as validation layer.
9. Coverage history/log for accountability.

Build steps 1–3 first as a working skeleton, then layer in the coverage-alert flow (step 5–6), since that's the highest-value problem to solve.
