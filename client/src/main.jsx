import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Theater Equipment Catalog - v3

// Set axios base URL from environment variable
// In production (Kinsta), use same domain (relative URL)
// In development, use localhost:3001
let apiUrl;

// Configure API URL based on environment
if (window.location.hostname === 'tonlager.kinsta.app') {
  // On Kinsta, always use relative URL (same domain)
  apiUrl = '';
} else if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
  // Other production environments, use relative URL
  apiUrl = '';
} else if (import.meta.env.VITE_API_URL && !window.location.hostname.includes('kinsta.app')) {
  // Only use VITE_API_URL in non-Kinsta environments
  apiUrl = import.meta.env.VITE_API_URL;
} else {
  // Development fallback - use local backend port 5000
  apiUrl = 'http://localhost:5000';
}

axios.defaults.baseURL = apiUrl;

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
