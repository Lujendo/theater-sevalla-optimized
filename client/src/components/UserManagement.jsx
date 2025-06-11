import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const UserManagement = () => {
  const { isAdmin, getUsers, register, impersonateUser, user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for new user form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'basic'
  });
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmImpersonate, setConfirmImpersonate] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // State for password reset
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // State for user editing
  const [editUser, setEditUser] = useState({
    username: '',
    role: 'basic'
  });

  // Fetch users
  const { data: users, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isAdmin(),
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', role: 'basic' });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      const response = await axios.put(`/api/auth/users/${userId}`, userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }) => {
      const response = await axios.put(`/api/auth/users/${userId}/password`, { newPassword });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success('Password reset successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await axios.delete(`/api/auth/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowDeleteModal(false);
      setSelectedUser(null);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  });

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditUser(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle password form input change
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!newUser.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!newUser.password.trim()) {
      errors.password = 'Password is required';
    } else if (newUser.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate edit form
  const validateEditForm = () => {
    const errors = {};

    if (!editUser.username.trim()) {
      errors.username = 'Username is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    registerMutation.mutate(newUser);
  };

  // Handle edit form submission
  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!validateEditForm()) {
      return;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: editUser
    });
  };

  // Handle password reset submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword: passwordData.newPassword
    });
  };

  // Handle user deletion
  const handleDeleteUser = () => {
    if (!selectedUser) return;

    deleteUserMutation.mutate(selectedUser.id);
  };

  // Handle impersonation
  const handleImpersonate = async () => {
    if (!selectedUser) return;

    try {
      await impersonateUser(selectedUser.id);
      setConfirmImpersonate(false);
      toast.info(`You are now impersonating ${selectedUser.username}`);
    } catch (err) {
      toast.error('Failed to impersonate user');
      console.error('Failed to impersonate user:', err);
    }
  };

  // Open edit modal
  const openEditModal = (userItem) => {
    setSelectedUser(userItem);
    setEditUser({
      username: userItem.username,
      role: userItem.role
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open password reset modal
  const openPasswordModal = (userItem) => {
    setSelectedUser(userItem);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setFormErrors({});
    setShowPasswordModal(true);
  };

  // Open delete confirmation modal
  const openDeleteModal = (userItem) => {
    setSelectedUser(userItem);
    setShowDeleteModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'advanced':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-slate-800">User Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create User
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : isError ? (
        <div className="p-4 text-center">
          <p className="text-red-500 mb-2">{error?.message || 'Failed to load users'}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users?.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {userItem.username}
                    {userItem.id === user.id && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(userItem.role)}`}>
                      {userItem.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(userItem.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(userItem)}
                        className="text-blue-600 hover:text-blue-900"
                        aria-label={`Edit ${userItem.username}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openPasswordModal(userItem)}
                        className="text-green-600 hover:text-green-900"
                        aria-label={`Reset password for ${userItem.username}`}
                      >
                        Reset Password
                      </button>
                      {userItem.id !== user.id && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUser(userItem);
                              setConfirmImpersonate(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            aria-label={`Impersonate ${userItem.username}`}
                          >
                            Impersonate
                          </button>
                          <button
                            onClick={() => openDeleteModal(userItem)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete ${userItem.username}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Create New User</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={newUser.username}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.username ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  {formErrors.username && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={newUser.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  disabled={registerMutation.isLoading}
                >
                  {registerMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Edit User</h3>

            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="edit-username"
                    name="username"
                    value={editUser.username}
                    onChange={handleEditInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.username ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                  {formErrors.username && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    value={editUser.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={updateUserMutation.isLoading}
                >
                  {updateUserMutation.isLoading ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Reset Password for {selectedUser.username}</h3>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.newPassword ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Enter new password"
                  />
                  {formErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    className={`w-full px-3 py-2 border ${formErrors.confirmPassword ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Confirm new password"
                  />
                  {formErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={resetPasswordMutation.isLoading}
                >
                  {resetPasswordMutation.isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Delete User</h3>
            <p className="text-slate-500 mb-4">
              Are you sure you want to delete user <strong>{selectedUser.username}</strong>?
              This action cannot be undone and will permanently remove the user from the system.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={deleteUserMutation.isLoading}
              >
                {deleteUserMutation.isLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonation confirmation modal */}
      {confirmImpersonate && selectedUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Confirm Impersonation</h3>
            <p className="text-slate-500 mb-4">
              You are about to impersonate <strong>{selectedUser.username}</strong> with role <strong>{selectedUser.role}</strong>.
              You will have the same permissions as this user until you end the impersonation.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmImpersonate(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Impersonate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
