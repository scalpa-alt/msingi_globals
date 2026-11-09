import { useState } from 'react';
import { Download, PlusSquare, Share } from 'lucide-react';
import Modal from '@/components/Modal';
import { useInstall } from '@/lib/pwa';

/**
 * "Install app" for every platform: one click where the browser supports it
 * (Chrome, Edge, Android, Samsung Internet), step-by-step help on iPhone/iPad and Mac Safari,
 * and nothing at all once the app is installed or where installing is not possible.
 */
export default function InstallButton({ variant = 'icon' }: { variant?: 'icon' | 'link' }) {
  const { state, install } = useInstall();
  const [help, setHelp] = useState(false);

  if (state === 'installed' || state === 'none') return null;

  const onClick = async () => {
    if (state === 'prompt') await install();
    else setHelp(true);
  };

  const steps =
    state === 'ios'
      ? [
          { icon: Share, text: 'Tap the Share button in Safari’s toolbar.' },
          { icon: PlusSquare, text: 'Choose “Add to Home Screen”.' },
          { icon: Download, text: 'Tap “Add”. Scholaria now opens like any other app.' },
        ]
      : [
          { icon: Share, text: 'In Safari’s menu bar choose File.' },
          { icon: PlusSquare, text: 'Choose “Add to Dock…”.' },
          { icon: Download, text: 'Click “Add”. Scholaria now opens in its own window.' },
        ];

  return (
    <>
      {variant === 'link' ? (
        <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400">
          <Download className="h-4 w-4" /> Install the app on this device
        </button>
      ) : (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:hover:bg-teal-500/10"
          aria-label="Install app"
        >
          <Download className="h-5 w-5" />
          <span className="hidden md:inline">Install app</span>
        </button>
      )}

      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Install Scholaria"
        description={state === 'ios' ? 'On iPhone and iPad, installing is done from Safari’s Share menu.' : 'Safari can add Scholaria to your Dock.'}
        footer={
          <button onClick={() => setHelp(false)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Got it
          </button>
        }
      >
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                <s.icon className="h-4 w-4" />
              </span>
              <span className="pt-1">{s.text}</span>
            </li>
          ))}
        </ol>
        {state === 'ios' && <p className="mt-4 text-xs text-slate-400">Not seeing “Add to Home Screen”? Open this page in Safari first.</p>}
      </Modal>
    </>
  );
}
