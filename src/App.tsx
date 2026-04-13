import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import PublicCard from './pages/PublicCard';
import EditCard from './pages/EditCard';
import CreateCard from './pages/CreateCard';
import Store from './pages/Store';
import AdminDashboard from './pages/AdminDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import SuccessCard from './pages/SuccessCard';
import EnterpriseContact from './pages/EnterpriseContact';
import ChoosePlan from './pages/ChoosePlan';
import CompanyDashboard from './pages/CompanyDashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  return user ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/store" element={<PrivateRoute><Store /></PrivateRoute>} />
            <Route path="/crear" element={<CreateCard />} />
            <Route path="/elegir-plan" element={<ChoosePlan />} />
            <Route path="/edit/:cardId?" element={<PrivateRoute><EditCard /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/empresa" element={<PrivateRoute><CompanyDashboard /></PrivateRoute>} />
            <Route path="/enterprise" element={<PrivateRoute><EnterpriseDashboard /></PrivateRoute>} />
            <Route path="/success/:cardId" element={<SuccessCard />} />
            <Route path="/enterprise-contact" element={<EnterpriseContact />} />
            <Route path="/c/:cardId" element={<PublicCard />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
