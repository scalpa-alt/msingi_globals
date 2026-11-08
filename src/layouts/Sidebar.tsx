import {
  LayoutDashboard,
  UserPlus,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Wallet,
  BookOpen,
  MessageSquare,
  UserCheck,
  Users,
  GraduationCap as Logo,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Role } from '@/context/AuthContext';
import { roleAccess, roleLabel } from '@/lib/access';
import { useApprovalCount } from '@/lib/useApprovalCount';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/approvals', label: 'Approvals', icon: UserCheck },
  { to: '/directory', label: 'Directory', icon: Users },
  { to: '/admissions', label: 'Admissions', icon: UserPlus },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/attendance', label: 'Attendance', icon: CheckSquare },
  { to: '/gradebook', label: 'Gradebook', icon: GraduationCap },
  { to: '/exams', label: 'Exams', icon: ClipboardList },
  { to: '/fees', label: 'Fees', icon: Wallet },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/results', label: 'Results', icon: GraduationCap },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
];

export function navItemsForRole(role: Role): NavItem[] {
  const allowed = roleAccess[role];
  return navItems.filter((item) => allowed.includes(item.to));
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  role: Role;
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile, role }: SidebarProps) {
  const items = navItemsForRole(role);
  const pending = useApprovalCount(role === 'administrator');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className={`flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Logo className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="lg:block">
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Scholaria</p>
              <p className="text-xs capitalize text-slate-400">{roleLabel[role]} Portal</p>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => mobileOpen && onCloseMobile()}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : ''}`} />
                  {!collapsed && <span className="lg:block">{item.label}</span>}
                  {item.to === '/approvals' && pending > 0 && (
                    <span
                      className={`rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white ${collapsed ? 'lg:absolute lg:right-2 lg:top-1' : 'ml-auto'}`}
                      aria-label={`${pending} pending approvals`}
                    >
                      {pending}
                    </span>
                  )}
                  {collapsed && (
                    <span className="pointer-events-none fixed left-20 z-50 ml-2 hidden rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg group-hover:opacity-100 lg:group-hover:block dark:bg-slate-700">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="hidden border-t border-slate-200 p-4 lg:block dark:border-slate-800">
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 p-4 text-white">
              <p className="text-xs font-semibold">Need help?</p>
              <p className="mt-1 text-xs text-teal-100">Check the docs or contact support.</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
