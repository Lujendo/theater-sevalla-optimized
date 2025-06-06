import React from 'react';
import { useAuth } from '../context/AuthContext';

const ImpersonationBanner = () => {
  const { user, isImpersonating, logout } = useAuth();

  if (!isImpersonating()) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-white py-2">
      <div className="container-app py-0 flex justify-between items-center">
        <div>
          <span className="font-bold">Impersonation Mode:</span> You are currently viewing the application as {user.username} ({user.role})
        </div>
        <button
          onClick={logout}
          className="bg-white text-yellow-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-100"
        >
          End Impersonation
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
