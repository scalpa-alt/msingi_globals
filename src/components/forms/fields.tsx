import { useId, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { passwordStrength } from '@/lib/validation';

export const controlClass = (error?: string, withIcon = false, trailing = false) =>
  `w-full rounded-xl border bg-white py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-200 ${
    withIcon ? 'pl-10' : 'pl-3.5'
  } ${trailing ? 'pr-10' : 'pr-3.5'} ${
    error
      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/20'
      : 'border-slate-200 focus:border-teal-400 focus:ring-teal-500/20 dark:border-slate-700'
  }`;

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className' | 'id'> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
}

export function TextField({ label, value, onValueChange, error, hint, icon: Icon, required, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          id={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={controlClass(error, !!Icon)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

interface PasswordFieldProps {
  label?: string;
  value: string;
  onValueChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordField({
  label = 'Password',
  value,
  onValueChange,
  onBlur,
  error,
  showStrength,
  autoComplete = 'new-password',
  placeholder = '••••••••',
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <FieldShell id={id} label={label} error={error} required>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={controlClass(error, true, true)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-teal-600 dark:hover:text-slate-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < strength ? (strength <= 1 ? 'bg-rose-400' : strength === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">{labels[strength]}</p>
        </div>
      )}
    </FieldShell>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}

export function SelectField({ label, value, onValueChange, onBlur, error, hint, required, children }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        className={controlClass(error)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** Yes / No segmented switch (radio group semantics). */
export function YesNoToggle({
  label,
  value,
  onValueChange,
  hint,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <p id={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div role="radiogroup" aria-labelledby={id} className="inline-flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        {[
          { v: true, text: 'Yes' },
          { v: false, text: 'No' },
        ].map((o) => (
          <button
            key={o.text}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onValueChange(o.v)}
            className={`px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
              value === o.v ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {o.text}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Multi-value "tags" input with quick-pick suggestions. Enter or comma adds a tag. */
export function TagInput({
  label,
  tags,
  onChange,
  suggestions = [],
  error,
  onBlur,
  max = 20,
  placeholder = 'Type a subject and press Enter',
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  error?: string;
  onBlur?: () => void;
  max?: number;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const value = raw.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!value || tags.length >= max) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) return;
    onChange([...tags, value]);
  };

  const commitDraft = () => {
    draft
      .split(',')
      .forEach((part) => add(part));
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remaining = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

  return (
    <FieldShell id={id} label={label} error={error} required>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 transition focus-within:ring-2 dark:bg-slate-900 ${
          error
            ? 'border-rose-400 focus-within:ring-rose-500/20'
            : 'border-slate-200 focus-within:border-teal-400 focus-within:ring-teal-500/20 dark:border-slate-700'
        }`}
      >
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="rounded p-0.5 hover:bg-teal-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 dark:hover:bg-teal-500/20"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            commitDraft();
            onBlur?.();
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggested subjects">
          {remaining.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 transition hover:border-teal-400 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-600 dark:text-slate-400"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  );
}
