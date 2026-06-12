import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningCircleIcon, ArrowLeftIcon } from '../components/Icons';

export const Expired = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isExpired');
    navigate('/login');
  };

  return (
    <div className="auth-screen">
      <div className="vibrant-background"></div>
      
      <div className="auth-card animate-in" style={{ textAlign: 'center' }}>
        
        <div className="auth-logo-container danger">
          <WarningCircleIcon size={32} color="currentColor" />
        </div>
        
        <h1 className="auth-title">Account Expired</h1>
        <p className="auth-subtitle" style={{ lineHeight: '1.6', marginBottom: '24px' }}>
          Your access to WhatsApp API has expired. Please contact your system administrator to renew your subscription or extend your access.
        </p>
        
        <button 
          onClick={handleLogout}
          className="btn-outline"
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ArrowLeftIcon size={16} /> Return to Login
        </button>
      </div>
    </div>
  );
};
