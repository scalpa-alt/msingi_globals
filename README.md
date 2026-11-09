# Scholaria — school management system

Headteachers, teachers and parents on one secure platform. React + TypeScript + Vite + Tailwind, with Supabase (Auth and Postgres) for data and access control.

## Roles

| Role | How they join | Can do |
|---|---|---|
| Headteacher / admin | Registers their school, then verifies their email | Everything in their school; approves teachers; sees the parent and student directory |
| Teacher | Registers, verifies email, **waits for admin approval** | Own timetable, attendance and grades for assigned classes; class teachers get a "My Class" roster with parent contacts |
| Parent | Registers with their children's names and classes, verifies email (no approval) | Follows their own children's timetable, attendance and results |

Access is enforced by Postgres row-level security, and every school's data is kept separate. See [docs/SCHEMA.md](docs/SCHEMA.md).

## Setup

1. **Database.** In the Supabase SQL editor run, in order, each as its own query:
   `supabase/migrations/001_schema.sql`, `002_teacher_scoped_access.sql`, `003_registration_and_tenancy.sql`, `004_parents_self_service.sql`, `005_class_standing.sql`.
2. **Environment variables** (Vercel → Settings → Environment Variables, or a local `.env`; copy `.env.example`):
   - `VITE_SUPABASE_URL` — the bare project URL, e.g. `https://abcd1234.supabase.co` (no path, no trailing slash)
   - `VITE_SUPABASE_ANON_KEY` — the `anon` / publishable key. Never use the `service_role` key.
   Vite reads these at build time, so redeploy after changing them.
3. **Supabase → Authentication → URL Configuration.**
   - Site URL: your production address
   - Redirect URLs: `https://YOUR-DOMAIN/login`, `https://YOUR-DOMAIN/reset-password` and `http://localhost:5173/**`
4. **Email.** Keep "Confirm email" on. Supabase's built-in sender allows only a few emails an hour, so add your own SMTP for real use.
5. Register the first headteacher through the **Create account → Headteacher** form.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

`vercel.json` rewrites every path to `index.html`, so refreshing or opening a deep link works.

## Project layout

```
src/
  context/AuthContext.tsx   session, profile and account status
  lib/                      supabase client, access rules (RBAC), validation, registration, school helpers
  components/forms/         validated form fields (text, password, select, yes/no, tags)
  pages/auth/               sign in, the three registration forms, password reset
  pages/Approvals.tsx       admin: approve or reject teachers
  pages/Directory.tsx       admin: parents and their children, searchable
  pages/teacher/            My Class roster, subject view and resources
  pages/AccountStatus.tsx   "Awaiting admin approval" and other non-active states
supabase/migrations/        database schema, row-level security and registration logic
```

## What is live data

Everything reads from your Supabase database: dashboards, timetable, attendance, gradebook, results (with class rank and average), exams, fees, library, messages, admissions, approvals, the parent directory and the notification bell. A brand-new school starts empty, and each page says so and shows what to do next.

## Known limits

- A parent's child is linked by name and class only; add an admission-number field if you need stronger proof.
- `books`, `fee_invoices` and `applicants` ids are shared across schools; make them per-school before onboarding many schools.
- Money is shown with a `$` sign; change `money()` in `src/lib/format.ts` for your currency.
- The enrolment chart counts students by when their record was created, so students imported all at once appear as one jump.
