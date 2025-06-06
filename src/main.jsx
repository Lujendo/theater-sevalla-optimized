import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Log environment variables for debugging
console.log('API URL:', import.meta.env.VITE_API_URL);

// Set axios base URL from environment variable
// In Docker environment, we need to use the correct service name
// Do NOT include /api in the base URL as it's included in the route paths
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
