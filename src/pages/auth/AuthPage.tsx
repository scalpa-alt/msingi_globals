import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SignupRole } from '@/lib/registration';
import SignInForm from './SignInForm';
import RegisterAdmin from './RegisterAdmin';
import RegisterTeacher from './RegisterTeacher';
import RegisterParent from './RegisterParent';
import { RegistrationSuccess } from './parts';

type Mode = 'signin' | 'register';

const roles: { id: SignupRole; label: string; blurb: string; icon: LucideIcon }[] = [
  { id: 'administrator', label: 'Headteacher', blurb: 'Register your school', icon: ShieldCheck },
  { id: 'teacher', label: 'Teacher', blurb: 'Join your school', icon: BookOpen },
  { id: 'parent', label: 'Parent', blurb: 'Follow your children', icon: Users },
];

const isRole = (v: string | null): v is SignupRole => v === 'administrator' || v === 'teacher' || v === 'parent';

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('tab') === 'register' ? 'register' : 'signin';
  const roleParam = params.get('role');
  const role: SignupRole = isRole(roleParam) ? roleParam : 'administrator';
  const [done, setDone] = useState<{ role: SignupRole; email: string; signedIn: boolean } | null>(null);

  const go = (next: { tab?: Mode; role?: SignupRole }) => {
    const p = new URLSearchParams(params);
    if (next.tab) p.set('tab', next.tab);
    if (next.role) p.set('role', next.role);
    setParams(p, { replace: true });
    setDone(null);
  };

  const finished = (email: string, signedIn: boolean) => setDone({ role, email, signedIn });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Brand panel */}
      <div className="relative hidden w-5/12 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Scholaria</p>
            <p className="text-sm text-teal-100">School Management System</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight text-white">A strong foundation for every school.</h1>
          <p className="mt-4 max-w-md text-teal-100">
            Headteachers, teachers and parents on one secure platform: approvals, classes, attendance, grades and
            communication in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-teal-50">
            {[
              'Teachers join only after the headteacher approves them',
              'Parents see only their own children',
              'Every school’s data is kept separate and private',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-teal-200">© {new Date().getFullYear()} Scholaria</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center overflow-y-auto px-5 py-10 lg:w-7/12 lg:justify-center lg:px-12">
        <div className="w-full max-w-xl">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">Scholaria</p>
          </div>

          {/* Sign in / Create account */}
          <div role="tablist" aria-label="Account" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                ['signin', 'Sign in'],
                ['register', 'Create account'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => go({ tab: id })}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  mode === id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <div role="tabpanel">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
              <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to access your dashboard.</p>
              <SignInForm />
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                New here?{' '}
                <button onClick={() => go({ tab: 'register' })} className="font-semibold text-teal-600 hover:underline dark:text-teal-400">
                  Create an account
                </button>
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create your account</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500 dark:text-slate-400">Choose how you will use Scholaria.</p>

              <div role="tablist" aria-label="Account type" className="mb-6 grid grid-cols-3 gap-2">
                {roles.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => go({ role: r.id })}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        active
                          ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <r.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{r.label}</span>
                      <span className="hidden text-xs opacity-70 sm:block">{r.blurb}</span>
                    </button>
                  );
                })}
              </div>

              <div role="tabpanel" aria-label={`${role} registration`}>
                {done ? (
                  <RegistrationSuccess role={done.role} email={done.email} signedIn={done.signedIn} onBack={() => go({ tab: 'signin' })} />
                ) : role === 'administrator' ? (
                  <RegisterAdmin onDone={finished} />
                ) : role === 'teacher' ? (
                  <RegisterTeacher onDone={finished} />
                ) : (
                  <RegisterParent onDone={finished} />
                )}
              </div>

              {!done && (
                <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already registered?{' '}
                  <button onClick={() => go({ tab: 'signin' })} className="font-semibold text-teal-600 hover:underline dark:text-teal-400">
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
