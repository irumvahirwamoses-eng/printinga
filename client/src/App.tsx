import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { PrivateRoute, TeacherRoute, OfficerRoute } from './routes/guards';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import SubmitRequest from './pages/SubmitRequest';
import MyRequests from './pages/MyRequests';
import OfficerRequests from './pages/OfficerRequests';
import RequestDetails from './pages/RequestDetails';
import PrintView from './pages/PrintView';
import TeacherManagement from './pages/TeacherManagement';
import BulkImport from './pages/BulkImport';
import NotificationsPage from './pages/Notifications';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import PrintHistory from './pages/PrintHistory';
import PrintersPage from './pages/PrintersPage';
import ChangePassword from './pages/ChangePassword';
import Messages from './pages/Messages';

function FirstLoginGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user?.isFirstLogin && loc.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<PrivateRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route element={<FirstLoginGuard><Layout /></FirstLoginGuard>}>
          <Route path="/requests/:id" element={<RequestDetails />} />
        </Route>
      </Route>

      <Route element={<OfficerRoute />}>
        <Route path="/print/:id" element={<FirstLoginGuard><PrintView /></FirstLoginGuard>} />
      </Route>

      <Route element={<TeacherRoute />}>
        <Route element={<FirstLoginGuard><Layout /></FirstLoginGuard>}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/submit" element={<SubmitRequest />} />
          <Route path="/teacher/requests" element={<MyRequests />} />
          <Route path="/teacher/messages" element={<Messages />} />
          <Route path="/teacher/notifications" element={<NotificationsPage />} />
          <Route path="/teacher/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<OfficerRoute />}>
        <Route element={<FirstLoginGuard><Layout /></FirstLoginGuard>}>
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/requests" element={<OfficerRequests />} />
          <Route path="/officer/messages" element={<Messages />} />
          <Route path="/officer/teachers" element={<TeacherManagement />} />
          <Route path="/officer/import" element={<BulkImport />} />
          <Route path="/officer/printers" element={<PrintersPage />} />
          <Route path="/officer/reports" element={<Reports />} />
          <Route path="/officer/history" element={<PrintHistory />} />
          <Route path="/officer/notifications" element={<NotificationsPage />} />
          <Route path="/officer/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={user ? (user.role === 'OFFICER' ? '/officer' : '/teacher') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
