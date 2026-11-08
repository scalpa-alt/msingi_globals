import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { PasswordField, SelectField, TextField } from '@/components/forms/fields';
import { confirmError, emailError, passwordError, phoneError, requiredText, useTouched } from '@/lib/validation';
import { registerAccount, useSchools } from '@/lib/registration';
import { FormBanner, SubmitButton } from './parts';

interface Child {
  key: number;
  name: string;
  className: string;
}

const MAX_CHILDREN = 10;

export default function RegisterParent({ onDone }: { onDone: (email: string, signedIn: boolean) => void }) {
  const { schools, loading: schoolsLoading, error: schoolsError } = useSchools();
  const [v, setV] = useState({ fullName: '', email: '', phone: '', schoolId: '', password: '', confirm: '' });
  const nextKey = useRef(2);
  const [children, setChildren] = useState<Child[]>([{ key: 1, name: '', className: '' }]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const t = useTouched();
  const set = (k: keyof typeof v) => (value: string) => setV((s) => ({ ...s, [k]: value }));

  const updateChild = (key: number, patch: Partial<Child>) =>
    setChildren((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const addChild = () => {
    if (children.length >= MAX_CHILDREN) return;
    setChildren((list) => [...list, { key: nextKey.current++, name: '', className: '' }]);
  };
  const removeChild = (key: number) => setChildren((list) => (list.length > 1 ? list.filter((c) => c.key !== key) : list));

  const errors: Record<string, string | undefined> = {
    fullName: requiredText('Full name', v.fullName),
    email: emailError('Email', v.email),
    phone: phoneError(v.phone),
    schoolId: v.schoolId ? undefined : 'Choose your children’s school.',
    password: passwordError(v.password),
    confirm: confirmError(v.password, v.confirm),
  };
  children.forEach((c) => {
    errors[`child-${c.key}-name`] = requiredText('Child’s name', c.name);
    errors[`child-${c.key}-class`] = requiredText('Class / grade', c.className, 1, 40);
  });
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
        signup_role: 'parent',
        full_name: v.fullName.trim(),
        phone: v.phone.trim(),
        school_id: v.schoolId,
        children: children.map((c) => ({ name: c.name.trim(), class: c.className.trim() })),
      },
    });
    setBusy(false);
    if (res.error) setFormError(res.error);
    else onDone(v.email.trim(), !!res.signedIn);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Your details are saved for the school to verify. Access to your children’s information is granted once they confirm you.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" required icon={User} autoComplete="name" value={v.fullName} onValueChange={set('fullName')}
          onBlur={() => t.touch('fullName')} error={err('fullName')} placeholder="Grace Njeri" />
        <TextField label="Phone number" required icon={Phone} type="tel" autoComplete="tel" value={v.phone} onValueChange={set('phone')}
          onBlur={() => t.touch('phone')} error={err('phone')} placeholder="+254 700 000 000" />
      </div>
      <TextField label="Email" required icon={Mail} type="email" autoComplete="email" value={v.email} onValueChange={set('email')}
        onBlur={() => t.touch('email')} error={err('email')} placeholder="you@email.com" />
      <SelectField label="School" required value={v.schoolId} onValueChange={set('schoolId')} onBlur={() => t.touch('schoolId')}
        error={err('schoolId') ?? schoolsError ?? undefined}
        hint={!schoolsLoading && schools.length === 0 && !schoolsError ? 'No schools are registered yet.' : undefined}>
        <option value="">{schoolsLoading ? 'Loading schools…' : 'Select your children’s school'}</option>
        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Your children <span className="text-rose-500" aria-hidden="true">*</span>
        </legend>
        {children.map((c, i) => (
          <div key={c.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Child {i + 1}</p>
              {children.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChild(c.key)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:hover:bg-rose-500/10"
                  aria-label={`Remove child ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="sm:col-span-3">
                <TextField label="Child’s full name" required value={c.name} onValueChange={(x) => updateChild(c.key, { name: x })}
                  onBlur={() => t.touch(`child-${c.key}-name`)} error={err(`child-${c.key}-name`)} placeholder="Aisha Njeri" />
              </div>
              <div className="sm:col-span-2">
                <TextField label="Class / grade" required value={c.className} onValueChange={(x) => updateChild(c.key, { className: x })}
                  onBlur={() => t.touch(`child-${c.key}-class`)} error={err(`child-${c.key}-class`)} placeholder="e.g. 9-A" />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addChild}
          disabled={children.length >= MAX_CHILDREN}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-teal-300 px-3.5 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-500/10"
        >
          <Plus className="h-4 w-4" /> Add another child
        </button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField value={v.password} onValueChange={set('password')} onBlur={() => t.touch('password')} error={err('password')} showStrength />
        <PasswordField label="Confirm password" value={v.confirm} onValueChange={set('confirm')} onBlur={() => t.touch('confirm')} error={err('confirm')} />
      </div>
      {formError && <FormBanner>{formError}</FormBanner>}
      <SubmitButton busy={busy}>Register as parent</SubmitButton>
    </form>
  );
}
