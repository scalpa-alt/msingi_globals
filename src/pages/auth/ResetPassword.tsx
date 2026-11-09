import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { PasswordField } from '@/components/forms/fields';
import { confirmError, passwordError, useTouched } from '@/lib/validation';
import { supabase } from '@/lib/supabase';
import { FormBanner, SubmitButton } from './parts';

/** Landing page of the "reset password" email link. Supabase signs the user in with a recovery session. */
export default function ResetPassword() {
  const [ready, setReady] = useState<'checking' | 'yes' | 'no'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const t = useTouched();

  useEffect(() => {
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady('yes');
    });
    // the link may already have been processed before this page mounted
    supabase.auth.getSession().then(({ data: s }) => {
      if (!cancelled) setReady((r) => (s.session ? 'yes' : r === 'checking' ? 'no' : r));
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const errors = { password: passwordError(password), confirm: confirmError(password, confirm) };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    t.markSubmitted();
    setFormError(null);
    if (errors.password || errors.confirm) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setFormError(error.message);
    else window.location.assign('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Scholaria</p>
        </div>

        {ready === 'checking' && <p className="text-sm text-slate-500">Checking your link…</p>}

        {ready === 'no' && (
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">This link has expired</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reset links work once and expire after a short time. Request a new one from the sign-in page.</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">Back to sign in</Link>
          </div>
        )}

        {ready === 'yes' && (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">At least 8 characters with a letter and a number.</p>
            </div>
            <PasswordField label="New password" value={password} onValueChange={setPassword} onBlur={() => t.touch('password')}
              error={t.show('password') ? errors.password : undefined} showStrength />
            <PasswordField label="Confirm new password" value={confirm} onValueChange={setConfirm} onBlur={() => t.touch('confirm')}
              error={t.show('confirm') ? errors.confirm : undefined} />
            {formError && <FormBanner>{formError}</FormBanner>}
            <SubmitButton busy={busy}>Save password</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
