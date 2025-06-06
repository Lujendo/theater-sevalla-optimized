import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Log environment variables for debugging
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Environment PROD:', import.meta.env.PROD);
console.log('Environment MODE:', import.meta.env.MODE);

// Set axios base URL from environment variable
// In production (Kinsta), use same domain (relative URL)
// In development, use localhost:5000
let apiUrl;
if (import.meta.env.VITE_API_URL) {
  apiUrl = import.meta.env.VITE_API_URL;
} else if (window.location.hostname === 'tonlager.kinsta.app' ||
           import.meta.env.PROD ||
           import.meta.env.MODE === 'production') {
  // In production on Kinsta, use relative URL (same domain)
  apiUrl = '';
} else {
  // In development
  apiUrl = 'http://localhost:5000';
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
