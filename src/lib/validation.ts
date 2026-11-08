import { useState } from 'react';

export type Errors<T extends string = string> = Partial<Record<T, string>>;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isPhone = (v: string) => /^\+?[0-9][0-9\s-]{7,16}[0-9]$/.test(v.trim());

export function requiredText(label: string, v: string, min = 2, max = 120): string | undefined {
  const t = v.trim();
  if (!t) return `${label} is required.`;
  if (t.length < min) return `${label} must be at least ${min} characters.`;
  if (t.length > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

export function emailError(label: string, v: string): string | undefined {
  if (!v.trim()) return `${label} is required.`;
  if (!isEmail(v)) return 'Enter a valid email address.';
  return undefined;
}

export function phoneError(v: string): string | undefined {
  if (!v.trim()) return 'Phone number is required.';
  if (!isPhone(v)) return 'Enter a valid phone number, e.g. +254 700 000 000.';
  return undefined;
}

export function passwordError(v: string): string | undefined {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Include at least one letter and one number.';
  return undefined;
}

export function confirmError(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Please confirm your password.';
  if (confirm !== password) return 'Passwords do not match.';
  return undefined;
}

/** 0-4 rough strength score, for the meter under the password field. */
export function passwordStrength(v: string): number {
  let s = 0;
  if (v.length >= 8) s += 1;
  if (v.length >= 12) s += 1;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s += 1;
  if (/[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) s += 1;
  return s;
}

/**
 * Tracks which fields the user has visited. Errors are shown for a field once it
 * has been blurred (and then update live as they type) or after a submit attempt.
 */
export function useTouched() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  return {
    submitted,
    touch: (key: string) => setTouched((t) => (t[key] ? t : { ...t, [key]: true })),
    show: (key: string) => submitted || !!touched[key],
    markSubmitted: () => setSubmitted(true),
  };
}
