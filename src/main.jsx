import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureAxios } from './utils/axiosConfig'
import axios from 'axios'

// Log environment variables for debugging
console.log('API URL:', import.meta.env.VITE_API_URL);

// Set axios base URL from environment variable
// In production (Kinsta), use relative URL to same domain
// In development, use localhost:5000
const apiUrl = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://tonlager.kinsta.app' : 'http://localhost:5000');
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
