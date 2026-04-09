import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/AuthPage/LoginPage';
import RegisterPage from './pages/AuthPage/RegisterPage';
import CitizenDashboard from './pages/CitizenDashboard/CitizenDashboard';
import ReportIssue from './pages/ReportIssue/ReportIssue';
import IssueDetail from './pages/IssueDetail/IssueDetail';
import MapView from './pages/MapView/MapView';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import AdminIssues from './pages/AdminIssues/AdminIssues';
import FieldWorkerDashboard from './pages/FieldWorkerDashboard/FieldWorkerDashboard';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
}

function FieldWorkerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user?.role === 'fieldworker' ? children : <Navigate to="/dashboard" />;
}

function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {children}
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/dashboard" element={<PrivateRoute><CitizenDashboard /></PrivateRoute>} />
      <Route path="/report" element={<PrivateRoute><ReportIssue /></PrivateRoute>} />
      <Route path="/issues/:id" element={<PrivateRoute><IssueDetail /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
      <Route path="/admin/issues" element={<AdminRoute><AdminLayout><AdminIssues /></AdminLayout></AdminRoute>} />
      <Route path="/fieldworker" element={<FieldWorkerRoute><FieldWorkerDashboard /></FieldWorkerRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            toastStyle={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
