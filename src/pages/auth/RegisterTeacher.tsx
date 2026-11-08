import { useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, Phone, User } from 'lucide-react';
import { PasswordField, SelectField, TagInput, TextField, YesNoToggle } from '@/components/forms/fields';
import { confirmError, emailError, passwordError, phoneError, requiredText, useTouched } from '@/lib/validation';
import { registerAccount, SUBJECT_SUGGESTIONS, useSchools } from '@/lib/registration';
import { FormBanner, SubmitButton } from './parts';

export default function RegisterTeacher({ onDone }: { onDone: (email: string, signedIn: boolean) => void }) {
  const { schools, loading: schoolsLoading, error: schoolsError } = useSchools();
  const [v, setV] = useState({ fullName: '', email: '', phone: '', schoolId: '', classLabel: '', password: '', confirm: '' });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const t = useTouched();
  const set = (k: keyof typeof v) => (value: string) => setV((s) => ({ ...s, [k]: value }));

  const errors: Record<string, string | undefined> = {
    fullName: requiredText('Full name', v.fullName),
    email: emailError('Email', v.email),
    phone: phoneError(v.phone),
    schoolId: v.schoolId ? undefined : 'Choose your school.',
    subjects: subjects.length === 0 ? 'Add at least one subject you teach.' : undefined,
    // Only required when they say they are a class teacher.
    classLabel: isClassTeacher ? requiredText('Assigned class', v.classLabel, 1, 40) : undefined,
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
        signup_role: 'teacher',
        full_name: v.fullName.trim(),
        phone: v.phone.trim(),
        school_id: v.schoolId,
        subjects,
        is_class_teacher: isClassTeacher,
        class_label: isClassTeacher ? v.classLabel.trim() : '',
      },
    });
    setBusy(false);
    if (res.error) setFormError(res.error);
    else onDone(v.email.trim(), !!res.signedIn);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Teacher accounts need approval from your headteacher before the dashboard unlocks.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" required icon={User} autoComplete="name" value={v.fullName} onValueChange={set('fullName')}
          onBlur={() => t.touch('fullName')} error={err('fullName')} placeholder="Peter Otieno" />
        <TextField label="Phone number" required icon={Phone} type="tel" autoComplete="tel" value={v.phone} onValueChange={set('phone')}
          onBlur={() => t.touch('phone')} error={err('phone')} placeholder="+254 700 000 000" />
      </div>
      <TextField label="Email" required icon={Mail} type="email" autoComplete="email" value={v.email} onValueChange={set('email')}
        onBlur={() => t.touch('email')} error={err('email')} placeholder="you@school.ac.ke" />
      <SelectField label="School" required value={v.schoolId} onValueChange={set('schoolId')} onBlur={() => t.touch('schoolId')}
        error={err('schoolId') ?? schoolsError ?? undefined}
        hint={!schoolsLoading && schools.length === 0 && !schoolsError ? 'No schools are registered yet. Ask your headteacher to register the school first.' : undefined}>
        <option value="">{schoolsLoading ? 'Loading schools…' : 'Select your school'}</option>
        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>
      <TagInput label="Subjects taught" tags={subjects} onChange={(x) => { setSubjects(x); t.touch('subjects'); }}
        suggestions={SUBJECT_SUGGESTIONS} error={err('subjects')} onBlur={() => t.touch('subjects')} />
      <YesNoToggle label="Are you a class teacher?" value={isClassTeacher} onValueChange={setIsClassTeacher}
        hint="A class teacher is responsible for one class and can see its learners and parent contacts." />
      {isClassTeacher && (
        <TextField label="Assigned class / grade" required value={v.classLabel} onValueChange={set('classLabel')}
          onBlur={() => t.touch('classLabel')} error={err('classLabel')} placeholder="e.g. 9-A or Grade 4" />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField value={v.password} onValueChange={set('password')} onBlur={() => t.touch('password')} error={err('password')} showStrength />
        <PasswordField label="Confirm password" value={v.confirm} onValueChange={set('confirm')} onBlur={() => t.touch('confirm')} error={err('confirm')} />
      </div>
      {formError && <FormBanner>{formError}</FormBanner>}
      <SubmitButton busy={busy}>Request teacher account</SubmitButton>
    </form>
  );
}
