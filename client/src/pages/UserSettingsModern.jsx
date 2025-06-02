import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EquipmentTypeManagerModern from '../components/EquipmentTypeManagerModern';
import CategoryManagerModern from '../components/CategoryManagerModern';
import LocationManagement from '../components/LocationManagement';
import { Card, Button, Input } from '../components/ui';

// Icons
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const SecurityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

const DatabaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
    <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
    <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

const UserSettingsModern = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Tabs for the settings page
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    { id: 'security', label: 'Security', icon: <SecurityIcon /> },
  ];

  // Add admin-only tabs
  if (user?.role === 'admin') {
    tabs.push({ id: 'equipmentTypes', label: 'Equipment Types', icon: <TagIcon /> });
    tabs.push({ id: 'categories', label: 'Categories', icon: <TagIcon /> });
    tabs.push({ id: 'locations', label: 'Locations', icon: <LocationIcon /> });
    tabs.push({ id: 'database', label: 'Database', icon: <DatabaseIcon /> });
  }

  // Handle password change
  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    // Here you would call the API to change the password
    // For now, we'll just simulate success
    setPasswordSuccess('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">User Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64">
          <Card>
            <Card.Body className="p-0">
              <nav>
                <ul className="divide-y divide-slate-100">
                  {tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 flex items-center transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                      >
                        <span className="mr-3 text-slate-500">{tab.icon}</span>
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card.Body>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card>
            <Card.Body>
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Profile Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Username
                      </label>
                      <div className="bg-slate-50 p-3 rounded-md text-slate-800 border border-slate-200">
                        {user?.username}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Role
                      </label>
                      <div className="bg-slate-50 p-3 rounded-md text-slate-800 border border-slate-200 capitalize">
                        {user?.role}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Security Settings</h2>

                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
                      {passwordSuccess}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <Input
                      type="password"
                      id="current-password"
                      label="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />

                    <Input
                      type="password"
                      id="new-password"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                    />

                    <Input
                      type="password"
                      id="confirm-password"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                    />

                    <div>
                      <Button
                        type="submit"
                        variant="primary"
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'equipmentTypes' && user?.role === 'admin' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Manage Equipment Types</h2>
                  <EquipmentTypeManagerModern />
                </div>
              )}

              {activeTab === 'categories' && user?.role === 'admin' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Manage Equipment Categories</h2>
                  <CategoryManagerModern />
                </div>
              )}

              {activeTab === 'locations' && user?.role === 'admin' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Manage Locations</h2>
                  <LocationManagement />
                </div>
              )}

              {activeTab === 'database' && user?.role === 'admin' && (
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-6">Database Management</h2>
                  <p className="mb-6 text-slate-600">
                    Access the database management interface to view and modify database tables directly.
                  </p>
                  <Button
                    as="a"
                    href="http://localhost:8080"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    className="inline-flex items-center"
                  >
                    <DatabaseIcon />
                    <span className="ml-2">Open phpMyAdmin</span>
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModern;
