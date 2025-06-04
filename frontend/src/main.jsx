import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Log environment variables for debugging
console.log('API URL:', import.meta.env.VITE_API_URL);

// Set axios base URL from environment variable
// In production (when served from the same domain), use relative URLs
// In development, use localhost
const getApiUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (when served from the same domain), use relative URLs
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // In development, use localhost
  return 'http://localhost:5000';
};

const apiUrl = getApiUrl();
axios.defaults.baseURL = apiUrl;
console.log('Setting axios baseURL to:', apiUrl);
console.log('Environment mode:', import.meta.env.MODE);
console.log('Is production:', import.meta.env.PROD);

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
