import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { Role } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Admissions from '@/pages/Admissions';
import ApplicantDetail from '@/pages/ApplicantDetail';
import Timetable from '@/pages/Timetable';
import Attendance from '@/pages/Attendance';
import Gradebook from '@/pages/Gradebook';
import Exams from '@/pages/Exams';
import Fees from '@/pages/Fees';
import Library from '@/pages/Library';
import Results from '@/pages/Results';
import Messages from '@/pages/Messages';

const roleAccess: Record<Role, string[]> = {
  administrator: ['/dashboard', '/admissions', '/timetable', '/attendance', '/gradebook', '/exams', '/fees', '/library', '/messages'],
  teacher: ['/dashboard', '/timetable', '/attendance', '/gradebook', '/exams', '/messages'],
  student: ['/dashboard', '/timetable', '/results', '/fees', '/library', '/messages'],
};

function hasAccess(role: Role, pathname: string): boolean {
  const allowed = roleAccess[role];
  return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!hasAccess(user.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/admissions/:id" element={<ApplicantDetail />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/gradebook" element={<Gradebook />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/library" element={<Library />} />
            <Route path="/results" element={<Results />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
