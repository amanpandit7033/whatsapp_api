import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Instances } from './pages/Instances';
import { Login } from './pages/Login';
import { Scan } from './pages/Scan';
import { Broadcast } from './pages/Broadcast';
import { ApiDocs } from './pages/ApiDocs';
import { Reports } from './pages/Reports';
import { AdminPanel } from './pages/AdminPanel';
import { Expired } from './pages/Expired';
import { Layout } from './components/Layout';

const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: string }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  const isExpired = localStorage.getItem('isExpired') === 'true';
  const permissionsStr = localStorage.getItem('permissions') || 'instances,broadcast,reports,docs';
  const permissions = permissionsStr.split(',');
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isExpired) return <Navigate to="/expired" replace />;
  
  if (requiredPermission && !permissions.includes(requiredPermission)) {
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
        <Route path="/instances" element={<ProtectedRoute requiredPermission="instances"><Instances /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute requiredPermission="instances"><Scan /></ProtectedRoute>} />
        <Route path="/broadcast" element={<ProtectedRoute requiredPermission="broadcast"><Broadcast /></ProtectedRoute>} />
        <Route path="/docs" element={<ProtectedRoute requiredPermission="docs"><ApiDocs /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requiredPermission="reports"><Reports /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
