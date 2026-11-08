import type { Role } from '@/context/AuthContext';

/** Which routes each role may open (the database enforces the same rules with row-level security). */
export const roleAccess: Record<Role, string[]> = {
  administrator: [
    '/dashboard', '/approvals', '/directory', '/admissions', '/timetable', '/attendance',
    '/gradebook', '/exams', '/fees', '/library', '/messages',
  ],
  teacher: ['/dashboard', '/timetable', '/attendance', '/gradebook', '/exams', '/messages'],
  student: ['/dashboard', '/timetable', '/results', '/fees', '/library', '/messages'],
  parent: ['/dashboard', '/timetable', '/results', '/fees', '/library', '/messages'],
};

export function hasAccess(role: Role, pathname: string): boolean {
  return roleAccess[role].some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export const roleLabel: Record<Role, string> = {
  administrator: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};
