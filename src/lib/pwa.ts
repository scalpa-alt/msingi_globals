import { useEffect, useState, useSyncExternalStore } from 'react';

/** Registers the service worker (production only) so the app can open offline and be installed. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app works fine without it */
    });
  });
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome, Edge, Samsung Internet and Opera fire this once, early. Capture it at load,
// before React has mounted, so a later "Install app" button can use it.
let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detect(): 'installed' | 'prompt' | 'ios' | 'mac-safari' | 'none' {
  if (installed || isStandalone()) return 'installed';
  if (deferredPrompt) return 'prompt';
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return 'ios';
  // Safari 17+ on a Mac can add a site to the Dock
  if (/^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua) && /Macintosh/.test(ua)) return 'mac-safari';
  return 'none';
}

export type InstallState = ReturnType<typeof detect>;

/** What the "Install app" button should do on this device. */
export function useInstall() {
  const state = useSyncExternalStore(subscribe, detect, () => 'none' as InstallState);

  async function install(): Promise<'accepted' | 'dismissed' | 'manual'> {
    if (!deferredPrompt) return 'manual';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null; // a prompt can be used once
    emit();
    return outcome;
  }

  return { state, install };
}

/** True while the browser reports a connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
