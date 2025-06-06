import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Log environment variables for debugging - v3 rebuild
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Environment PROD:', import.meta.env.PROD);
console.log('Environment MODE:', import.meta.env.MODE);
console.log('🚀 Theater Equipment Catalog - Kinsta Deployment v3');

// Set axios base URL from environment variable
// In production (Kinsta), use same domain (relative URL)
// In development, use localhost:5000
let apiUrl;

// Force correct behavior for Kinsta deployment
if (window.location.hostname === 'tonlager.kinsta.app') {
  // On Kinsta, always use relative URL (same domain)
  apiUrl = '';
  console.log('🎯 Kinsta detected - using relative URL');
} else if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
  // Other production environments, use relative URL
  apiUrl = '';
  console.log('🏭 Production mode - using relative URL');
} else if (import.meta.env.VITE_API_URL && !window.location.hostname.includes('kinsta.app')) {
  // Only use VITE_API_URL in non-Kinsta environments
  apiUrl = import.meta.env.VITE_API_URL;
  console.log('🔧 Using VITE_API_URL:', apiUrl);
} else {
  // Development fallback
  apiUrl = 'http://localhost:5000';
  console.log('💻 Development mode - using localhost');
}

axios.defaults.baseURL = apiUrl;
console.log('Setting axios baseURL to:', apiUrl);

// Configure axios with CSRF token before rendering the app
const renderApp = async () => {
  await configureAxios();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

renderApp();
