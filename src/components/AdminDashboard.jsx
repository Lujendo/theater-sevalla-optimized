import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminDashboard = () => {
  const { isAdmin, getUsers, impersonateUser, register, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for user management
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmImpersonate, setConfirmImpersonate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'basic'
  });
  const [formErrors, setFormErrors] = useState({});

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

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

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));

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

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    registerMutation.mutate(newUser);
  };

  // Handle impersonation
  const handleImpersonate = async () => {
    if (!selectedUser) return;

    try {
      await impersonateUser(selectedUser.id);
      setConfirmImpersonate(false);
      toast.info(`You are now impersonating ${selectedUser.username}`);
      navigate('/');
    } catch (err) {
      toast.error('Failed to impersonate user');
      console.error('Failed to impersonate user:', err);
    }
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
    return <div className="text-center py-10">Access denied. Admin privileges required.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error?.message || 'Failed to load users.'}</span>
        <button
          onClick={refetch}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">User Management</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create User
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
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
                      {userItem.id !== user.id && (
                        <button
                          onClick={() => {
                            setSelectedUser(userItem);
                            setConfirmImpersonate(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          aria-label={`Impersonate ${userItem.username}`}
                        >
                          Impersonate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                    className={`w-full px-3 py-2 border ${formErrors.username ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
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
                    className={`w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  disabled={registerMutation.isLoading}
                >
                  {registerMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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

export default AdminDashboard;
