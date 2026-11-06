import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu,
  Moon,
  PanelsTopLeft,
  Search,
  Sun,
  ChevronDown,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { notifications } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';

interface TopbarProps {
  onToggleMobile: () => void;
  onToggleCollapse: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const roleLabels: Record<string, string> = {
  administrator: 'Administrator',
  teacher: 'Teacher',
  student: 'Student / Parent',
};

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

export default function Topbar({ onToggleMobile, onToggleCollapse, theme, onToggleTheme }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      {/* Mobile menu */}
      <button
        onClick={onToggleMobile}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop collapse */}
      <button
        onClick={onToggleCollapse}
        className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block dark:hover:bg-slate-800"
        aria-label="Collapse sidebar"
      >
        <PanelsTopLeft className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search students, classes, books…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
          onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right animate-scale-in rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                  {notifications.length} new
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{n.detail}</p>
                      <p className="mt-1 text-xs text-slate-400">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full border-t border-slate-200 py-2.5 text-center text-xs font-medium text-teal-600 hover:bg-slate-50 dark:border-slate-800 dark:text-teal-400 dark:hover:bg-slate-800/50">
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-semibold text-white">
              {user ? initials(user.name) : 'U'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-400">{user ? roleLabels[user.role] : ''}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right animate-scale-in rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name ?? 'User'}</p>
                <p className="text-xs text-slate-400">{user?.email ?? ''}</p>
              </div>
              <div className="py-1">
                {[
                  { label: 'My Profile', icon: User },
                  { label: 'Settings', icon: Settings },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <item.icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-200 py-1 dark:border-slate-800">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
