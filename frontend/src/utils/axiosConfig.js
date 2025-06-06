import axios from 'axios';

// Function to fetch CSRF token (only used in production)
export const fetchCsrfToken = async () => {
  try {
    // In development, we don't use CSRF protection
    if (import.meta.env.DEV) {
      return null;
    }

    const response = await axios.get('/api/csrf-token', { withCredentials: true });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Configure axios
export const configureAxios = async () => {
  // Set withCredentials to true for all requests to include cookies
  axios.defaults.withCredentials = true;

  // Note: Base URL is now set in main.jsx from environment variables

  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Set Authorization header if token exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Set up response interceptor to handle token expiration
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Special handling for file access errors
      if (originalRequest && (
          originalRequest.url.includes('/files/') ||
          originalRequest.url.includes('/public-files/')
        )) {
        console.log('File access error:', error);
        // Don't redirect to login for file access errors
        return Promise.reject(error);
      }

      // If the error is due to an expired token (401) and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to silently re-login or refresh token
          // For now, we'll just redirect to login page
          if (window.location.pathname !== '/login') {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];

            // Show a message to the user
            alert('Your session has expired. Please log in again.');

            // Redirect to login page
            window.location.href = '/login';
          }
          return Promise.reject(error);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  // In production, set up CSRF token
  if (!import.meta.env.DEV) {
    // Fetch CSRF token
    const csrfToken = await fetchCsrfToken();

    if (csrfToken) {
      // Set up request interceptor to add CSRF token to all non-GET requests
      axios.interceptors.request.use(
        async (config) => {
          // Only add CSRF token to non-GET requests
          if (config.method !== 'get') {
            config.headers['CSRF-Token'] = csrfToken;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );
    }
  }

  return axios;
};

export default configureAxios;
