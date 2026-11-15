import { WifiOff } from 'lucide-react';
import { useOnline } from '@/lib/pwa';

/** Shown across the top of the app while the device has no connection. */
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
      <WifiOff className="h-4 w-4 shrink-0" />
      You are offline. Saving and loading need a connection and will work again when you are back online.
    </div>
  );
}
