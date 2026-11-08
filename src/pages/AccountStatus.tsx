import { CheckCircle2, Clock, GraduationCap, LogOut, Mail, RefreshCw, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Copy {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
  steps?: string[];
}

function copyFor(role: string, status: string): Copy {
  if (status === 'rejected') {
    return {
      icon: ShieldAlert,
      tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
      title: 'Registration not approved',
      body: 'The school could not approve this registration. If you think this is a mistake, please contact the school office.',
    };
  }
  if (status === 'unverified') {
    return {
      icon: Mail,
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      title: 'Verify your email',
      body: 'Open the verification link we emailed you, then come back and press “Check status”.',
    };
  }
  if (role === 'teacher') {
    return {
      icon: Clock,
      tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
      title: 'Awaiting admin approval',
      body: 'Thanks for registering. Your headteacher needs to confirm your account before you can use the dashboard.',
      steps: ['Your request is in the headteacher’s approval queue.', 'You will get full access as soon as it is approved.', 'Press “Check status” to see if you have been approved.'],
    };
  }
  if (role === 'parent') {
    return {
      icon: Clock,
      tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
      title: 'Your details are being verified',
      body: 'The school is checking your registration and will link your children to your account.',
      steps: ['The school office reviews your details.', 'Your children are linked to your account.', 'You can then follow their timetable and results.'],
    };
  }
  return {
    icon: Clock,
    tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    title: 'Account setup in progress',
    body: 'Your account has not been activated yet. Please ask your school administrator to finish setting it up.',
  };
}

/** Shown instead of the app for accounts that are not active (pending approval, rejected, unverified). */
export default function AccountStatus() {
  const { user, logout, refresh } = useAuth();
  if (!user) return null;
  const c = copyFor(user.role, user.status);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Scholaria</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card dark:border-slate-800 dark:bg-slate-900" role="status">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${c.tone}`}>
            <c.icon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{c.title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Hello {user.name.split(' ')[0]}. {c.body}
          </p>

          {c.steps && (
            <ul className="mt-5 space-y-2 text-left text-sm text-slate-600 dark:text-slate-300">
              {c.steps.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                  {s}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => refresh()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <RefreshCw className="h-4 w-4" /> Check status
            </button>
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">Signed in as {user.email}</p>
        </div>
      </div>
    </div>
  );
}
