import React from 'react';
import { useAuth } from '../context/AuthContext';

const ImpersonationBanner = () => {
  const { user, isImpersonating, stopImpersonation } = useAuth();

  if (!isImpersonating()) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    }
  };

  return (
    <div className="bg-yellow-500 text-white py-2 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <span className="font-bold">Impersonation Mode:</span> You are currently viewing the application as{' '}
            <span className="font-semibold">{user.username}</span> ({user.role})
            {user.originalAdmin && (
              <span className="text-yellow-100 ml-2">
                • Original admin: {user.originalAdmin}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleStopImpersonation}
          className="bg-white text-yellow-700 px-4 py-1 rounded-md text-sm font-medium hover:bg-yellow-100 transition-colors duration-200 flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>End Impersonation</span>
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
