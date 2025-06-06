const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('[DATABASE SERVICE] Testing connection to:', `${API_BASE_URL}/api/database/test`);

    const response = await fetch(`${API_BASE_URL}/api/database/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('[DATABASE SERVICE] Test response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DATABASE SERVICE] Test error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[DATABASE SERVICE] Test data:', data);
    return data;
  } catch (error) {
    console.error('Error testing database connection:', error);
    throw error;
  }
};

// Get all database tables
export const getDatabaseTables = async () => {
  try {
    console.log('[DATABASE SERVICE] Fetching tables from:', `${API_BASE_URL}/api/database/tables`);
    console.log('[DATABASE SERVICE] Token:', localStorage.getItem('token') ? 'Present' : 'Missing');

    const response = await fetch(`${API_BASE_URL}/api/database/tables`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('[DATABASE SERVICE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DATABASE SERVICE] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[DATABASE SERVICE] Tables data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching database tables:', error);
    throw error;
  }
};

// Get table structure
export const getTableStructure = async (tableName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/database/tables/${tableName}/structure`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching table structure:', error);
    throw error;
  }
};

// Get table data with pagination
export const getTableData = async (tableName, page = 1, limit = 50) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/database/tables/${tableName}/data?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching table data:', error);
    throw error;
  }
};

// Execute custom SQL query
export const executeQuery = async (query) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

// Update table row
export const updateTableRow = async (tableName, id, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/database/tables/${tableName}/rows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating table row:', error);
    throw error;
  }
};

// Get database information
export const getDatabaseInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/database/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching database info:', error);
    throw error;
  }
};
