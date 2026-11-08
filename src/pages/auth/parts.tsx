import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import type { SignupRole } from '@/lib/registration';

export function FormBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-slate-950"
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

const nextSteps: Record<SignupRole, string[]> = {
  administrator: [
    'Open the verification link we emailed you.',
    'Your school is created and you receive full administrator access automatically.',
    'Sign in, then invite and approve your teachers and parents.',
  ],
  teacher: [
    'Open the verification link we emailed you.',
    'Sign in. Your account will show "Awaiting admin approval".',
    'Once the headteacher approves you, your dashboard unlocks.',
  ],
  parent: [
    'Open the verification link we emailed you.',
    'Sign in. The school will verify your details and link your children.',
    'After verification you can follow your children’s timetable and results.',
  ],
};

/** Shown after a successful registration. */
export function RegistrationSuccess({
  role,
  email,
  signedIn,
  onBack,
}: {
  role: SignupRole;
  email: string;
  signedIn: boolean;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
        {signedIn ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
        {signedIn ? 'Registration received' : 'Check your email'}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {signedIn ? (
          'Your account has been created.'
        ) : (
          <>
            We sent a verification link to <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>.
          </>
        )}
      </p>
      <ol className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-slate-600 dark:text-slate-300">
        {nextSteps[role].map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <button
        onClick={onBack}
        className="mt-6 text-sm font-medium text-teal-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400"
      >
        Go to sign in
      </button>
    </div>
  );
}
