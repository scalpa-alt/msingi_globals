import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return errors;
}

export default function Login() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (submitted) {
      setErrors(validate({ ...form, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const message = await login(form.email.trim(), form.password);
    setSubmitting(false);
    if (message) {
      setFormError(message === 'Invalid login credentials' ? 'Incorrect email or password.' : message);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-12 lg:flex">
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
          <h1 className="text-3xl font-bold leading-tight text-white">
            Manage your school, all in one place.
          </h1>
          <p className="mt-4 max-w-md text-teal-100">
            Admissions, attendance, grades, fees and more — streamlined for administrators, teachers, students and parents.
          </p>
        </div>
        <div className="relative flex gap-8 text-teal-50">
          <div>
            <p className="text-2xl font-bold">1,248</p>
            <p className="text-xs text-teal-200">Students</p>
          </div>
          <div>
            <p className="text-2xl font-bold">86</p>
            <p className="text-xs text-teal-200">Staff</p>
          </div>
          <div>
            <p className="text-2xl font-bold">32</p>
            <p className="text-xs text-teal-200">Classes</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">Scholaria</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to access your dashboard.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@scholaria.edu"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-200 ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-teal-400 focus:ring-teal-500/20 dark:border-slate-700'
                  }`}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-200 ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-teal-400 focus:ring-teal-500/20 dark:border-slate-700'
                  }`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.password}
                </p>
              )}
            </div>

            {(formError || authError || !isSupabaseConfigured) && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {formError ?? authError ?? 'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Accounts are created by the school administrator. Your role is set on your account.
          </p>
        </div>
      </div>
    </div>
  );
}
