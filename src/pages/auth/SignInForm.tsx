import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { PasswordField, TextField } from '@/components/forms/fields';
import { emailError, useTouched } from '@/lib/validation';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { FormBanner, SubmitButton } from './parts';

export default function SignInForm() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const t = useTouched();

  const errors = {
    email: emailError('Email', email),
    password: password ? undefined : 'Password is required.',
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    t.markSubmitted();
    setFormError(null);
    setNeedsVerification(false);
    setResent(false);
    if (errors.email || errors.password) return;
    setBusy(true);
    const message = await login(email.trim(), password);
    setBusy(false);
    if (!message) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (/email not confirmed/i.test(message)) {
      setNeedsVerification(true);
      setFormError('Please verify your email first. Check your inbox for the verification link.');
    } else if (/invalid login credentials/i.test(message)) {
      setFormError('Incorrect email or password.');
    } else {
      setFormError(message);
    }
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setFormError(error.message);
    else setResent(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField label="Email address" required icon={Mail} type="email" autoComplete="email" value={email} onValueChange={setEmail}
        onBlur={() => t.touch('email')} error={t.show('email') ? errors.email : undefined} placeholder="you@school.ac.ke" />
      <PasswordField value={password} onValueChange={setPassword} onBlur={() => t.touch('password')}
        error={t.show('password') ? errors.password : undefined} autoComplete="current-password" />

      {(formError || authError || !isSupabaseConfigured) && (
        <FormBanner>
          {formError ?? authError ?? 'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
          {needsVerification && !resent && (
            <button type="button" onClick={resend} className="ml-2 font-semibold underline">Resend email</button>
          )}
          {resent && <span className="ml-2 font-semibold">Verification email sent.</span>}
        </FormBanner>
      )}

      <SubmitButton busy={busy}>Sign in</SubmitButton>
    </form>
  );
}
