import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Mail, Phone, User } from 'lucide-react';
import { TextField, PasswordField } from '@/components/forms/fields';
import { confirmError, emailError, passwordError, phoneError, requiredText, useTouched } from '@/lib/validation';
import { registerAccount } from '@/lib/registration';
import { FormBanner, SubmitButton } from './parts';

export default function RegisterAdmin({ onDone }: { onDone: (email: string, signedIn: boolean) => void }) {
  const [v, setV] = useState({ fullName: '', email: '', schoolName: '', schoolEmail: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const t = useTouched();
  const set = (k: keyof typeof v) => (value: string) => setV((s) => ({ ...s, [k]: value }));

  const errors: Record<string, string | undefined> = {
    fullName: requiredText('Full name', v.fullName),
    email: emailError('Personal email', v.email),
    schoolName: requiredText('School name', v.schoolName, 3),
    schoolEmail: emailError('School email', v.schoolEmail),
    phone: phoneError(v.phone),
    password: passwordError(v.password),
    confirm: confirmError(v.password, v.confirm),
  };
  const err = (k: string) => (t.show(k) ? errors[k] : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    t.markSubmitted();
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    const res = await registerAccount({
      email: v.email,
      password: v.password,
      metadata: {
        signup_role: 'administrator',
        full_name: v.fullName.trim(),
        phone: v.phone.trim(),
        school_name: v.schoolName.trim(),
        school_email: v.schoolEmail.trim(),
      },
    });
    setBusy(false);
    if (res.error) setFormError(res.error);
    else onDone(v.email.trim(), !!res.signedIn);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Register your school. After you verify your email you become its administrator with full access.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" required icon={User} autoComplete="name" value={v.fullName} onValueChange={set('fullName')}
          onBlur={() => t.touch('fullName')} error={err('fullName')} placeholder="Jane Wanjiru" />
        <TextField label="Phone number" required icon={Phone} type="tel" autoComplete="tel" value={v.phone} onValueChange={set('phone')}
          onBlur={() => t.touch('phone')} error={err('phone')} placeholder="+254 700 000 000" />
      </div>
      <TextField label="Personal email" required icon={Mail} type="email" autoComplete="email" value={v.email} onValueChange={set('email')}
        onBlur={() => t.touch('email')} error={err('email')} placeholder="you@gmail.com" hint="You will sign in with this address." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="School name" required icon={Building2} value={v.schoolName} onValueChange={set('schoolName')}
          onBlur={() => t.touch('schoolName')} error={err('schoolName')} placeholder="Msingi Academy" />
        <TextField label="School email" required icon={Mail} type="email" value={v.schoolEmail} onValueChange={set('schoolEmail')}
          onBlur={() => t.touch('schoolEmail')} error={err('schoolEmail')} placeholder="info@school.ac.ke" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField value={v.password} onValueChange={set('password')} onBlur={() => t.touch('password')} error={err('password')} showStrength />
        <PasswordField label="Confirm password" value={v.confirm} onValueChange={set('confirm')} onBlur={() => t.touch('confirm')} error={err('confirm')} />
      </div>
      {formError && <FormBanner>{formError}</FormBanner>}
      <SubmitButton busy={busy}>Create school account</SubmitButton>
    </form>
  );
}
