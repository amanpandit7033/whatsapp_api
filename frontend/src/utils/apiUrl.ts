/**
 * Dynamically resolves the Base API Host URL.
 * If accessed via a custom domain (e.g. https://portal.brand.com) or production domain (https://wap.ut1.in),
 * it returns window.location.origin so all API documentation, cURL examples, and quick send URLs
 * dynamically reflect the exact host domain the user is logged into.
 */
export const getBaseApiUrl = (): string => {
  if (typeof window === 'undefined') return import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_API_URL || `${window.location.protocol}//${hostname}:5000`;
  }
  
  return window.location.origin;
};
