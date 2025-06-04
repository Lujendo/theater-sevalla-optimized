import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on initial load and set up token refresh
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);
        setError(null);
      } catch (err) {
        console.error('Token verification failed:', err);
        // Only logout if it's a 401 Unauthorized error
        if (err.response && err.response.status === 401) {
          logout();
          setError('Session expired. Please log in again.');
        } else {
          // For other errors, don't logout automatically
          setError('Error verifying session. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyToken();

    // Set up a timer to refresh the token every hour (to catch expiring tokens)
    const refreshInterval = setInterval(() => {
      if (token) {
        // If there's a token, try to silently refresh it by calling /api/auth/me
        verifyToken();
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      clearInterval(refreshInterval);
    };
  }, [token]);

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', { username, password });
      const { token: newToken, user: userData } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', newToken);

      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      setToken(newToken);
      setUser(userData);
      setError(null);

      return userData;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Register function (admin only)
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', userData);
      return response.data;
    } catch (err) {
      console.error('Register error:', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Role-based access control functions
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isAdvanced = () => {
    return user?.role === 'advanced';
  };

  const isBasic = () => {
    return user?.role === 'basic';
  };

  // Check if user has permission to edit equipment
  const canEditEquipment = () => {
    return user?.role === 'admin' || user?.role === 'advanced';
  };

  // Check if user is being impersonated
  const isImpersonating = () => {
    return !!user?.impersonated;
  };

  // Impersonate another user (admin only)
  const impersonateUser = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/auth/impersonate/${userId}`);
      const { token: newToken, user: userData } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setError(null);

      return userData;
    } catch (err) {
      console.error('Impersonation error:', err);
      setError(err.response?.data?.message || 'Impersonation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get list of users (admin only)
  const getUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users');
      return response.data.users;
    } catch (err) {
      console.error('Get users error:', err);
      setError(err.response?.data?.message || 'Failed to get users');
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    isAdmin,
    isAdvanced,
    isBasic,
    canEditEquipment,
    isImpersonating,
    impersonateUser,
    getUsers
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
