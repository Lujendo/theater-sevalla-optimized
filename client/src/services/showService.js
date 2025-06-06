const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Get all shows
export const getShows = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);

    const response = await fetch(`${API_BASE_URL}/api/shows?${queryParams}`, {
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
    console.error('Error fetching shows:', error);
    throw error;
  }
};

// Get single show
export const getShow = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shows/${id}`, {
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
    console.error('Error fetching show:', error);
    throw error;
  }
};

// Create new show
export const createShow = async (showData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(showData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating show:', error);
    throw error;
  }
};

// Update show
export const updateShow = async (id, showData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(showData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating show:', error);
    throw error;
  }
};

// Delete show
export const deleteShow = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shows/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};

// Get equipment for a show
export const getShowEquipment = async (showId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/show/${showId}`, {
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
    console.error('Error fetching show equipment:', error);
    throw error;
  }
};

// Add equipment to show
export const addEquipmentToShow = async (showId, equipmentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/show/${showId}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(equipmentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding equipment to show:', error);
    throw error;
  }
};

// Update show equipment
export const updateShowEquipment = async (id, equipmentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(equipmentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating show equipment:', error);
    throw error;
  }
};

// Check out equipment
export const checkoutEquipment = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/${id}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking out equipment:', error);
    throw error;
  }
};

// Return equipment
export const returnEquipment = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/${id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error returning equipment:', error);
    throw error;
  }
};

// Remove equipment from show
export const removeEquipmentFromShow = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/show-equipment/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing equipment from show:', error);
    throw error;
  }
};
