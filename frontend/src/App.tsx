import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Instances } from './pages/Instances';
import { Login } from './pages/Login';
import { Scan } from './pages/Scan';
import { Broadcast } from './pages/Broadcast';
import { NumberFilter } from './pages/NumberFilter';
import { NumberFilterBatch } from './pages/NumberFilterBatch';
import { Groups } from './pages/Groups';
import { ApiDocs } from './pages/ApiDocs';
import { Reports } from './pages/Reports';
import { AdminPanel } from './pages/AdminPanel';
import { AdminWhiteLabel } from './pages/AdminWhiteLabel';
import { ResellerPanel } from './pages/ResellerPanel';
import { LiveStatus } from './pages/LiveStatus';
import { Expired } from './pages/Expired';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { Layout } from './components/Layout';

const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: string }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  const isExpired = localStorage.getItem('isExpired') === 'true';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const permissionsStr = localStorage.getItem('permissions') || 'instances,broadcast,filter,groups,reports,docs';
  const permissions = permissionsStr.split(',');
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isExpired) return <Navigate to="/expired" replace />;
  
  if (!isAdmin && requiredPermission && !permissions.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/expired" element={<Expired />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/instances" element={<ProtectedRoute requiredPermission="instances"><Instances /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute requiredPermission="instances"><Scan /></ProtectedRoute>} />
        <Route path="/broadcast" element={<ProtectedRoute requiredPermission="broadcast"><Broadcast /></ProtectedRoute>} />
        <Route path="/filter" element={<ProtectedRoute requiredPermission="filter"><NumberFilter /></ProtectedRoute>} />
        <Route path="/filter/batch/:id" element={<ProtectedRoute requiredPermission="filter"><NumberFilterBatch /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute requiredPermission="groups"><Groups /></ProtectedRoute>} />
        <Route path="/docs" element={<ProtectedRoute requiredPermission="docs"><ApiDocs /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requiredPermission="reports"><Reports /></ProtectedRoute>} />
        <Route path="/live-status" element={<ProtectedRoute><LiveStatus /></ProtectedRoute>} />
        <Route path="/reseller" element={<ProtectedRoute><ResellerPanel /></ProtectedRoute>} />
        <Route path="/whitelabel" element={<ProtectedRoute><AdminWhiteLabel /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/user-management" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
