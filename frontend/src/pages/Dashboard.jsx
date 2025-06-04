import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">
            Welcome back, {user?.name || 'User'}! Here's an overview of your theater equipment.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
          <p>Dashboard is loading...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
