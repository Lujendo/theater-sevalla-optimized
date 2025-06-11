import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import PasswordResetTest from './PasswordResetTest';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin()) {
    return <div className="text-center py-10">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'test'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Password Reset Test
          </button>
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">User Management</h2>
            <p className="text-slate-600 mb-6">
              Manage user accounts, reset passwords, and control access permissions.
            </p>
            <UserManagement />
          </div>
        )}

        {activeTab === 'test' && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Password Reset Test</h2>
            <p className="text-slate-600 mb-6">
              Test password reset functionality to diagnose any issues.
            </p>
            <PasswordResetTest />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
