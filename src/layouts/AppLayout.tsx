import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuth } from '@/context/AuthContext';
import OfflineBanner from '@/components/OfflineBanner';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        role={user!.role}
      />
      <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <OfflineBanner />
        <Topbar
          onToggleMobile={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={isDesktop ? 'd' : 'm'} className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
