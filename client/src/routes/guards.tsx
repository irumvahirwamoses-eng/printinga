import { Navigate, Outlet } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function Loading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-blue-700">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100"><Printer className="h-6 w-6 animate-pulse" /></span>
      <p className="text-sm font-medium">Loading SchoolPrint…</p>
    </div>
  );
}

export function PrivateRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function TeacherRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TEACHER') return <Navigate to="/officer" replace />;
  return <Outlet />;
}

export function OfficerRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OFFICER') return <Navigate to="/teacher" replace />;
  return <Outlet />;
}
