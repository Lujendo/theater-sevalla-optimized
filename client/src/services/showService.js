import axios from 'axios';

// Get all shows
export const getShows = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);

    const response = await axios.get(`/api/shows?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }
};

// Get single show
export const getShow = async (id) => {
  try {
    const response = await axios.get(`/api/shows/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching show:', error);
    throw error;
  }
};

// Create new show
export const createShow = async (showData) => {
  try {
    const response = await axios.post('/api/shows', showData);
    return response.data;
  } catch (error) {
    console.error('Error creating show:', error);
    throw error;
  }
};

// Update show
export const updateShow = async (id, showData) => {
  try {
    const response = await axios.put(`/api/shows/${id}`, showData);
    return response.data;
  } catch (error) {
    console.error('Error updating show:', error);
    throw error;
  }
};

// Delete show
export const deleteShow = async (id) => {
  try {
    const response = await axios.delete(`/api/shows/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};

// Get equipment for a show
export const getShowEquipment = async (showId) => {
  try {
    const response = await axios.get(`/api/show-equipment/show/${showId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching show equipment:', error);
    throw error;
  }
};

// Add equipment to show
export const addEquipmentToShow = async (showId, equipmentData) => {
  try {
    const response = await axios.post(`/api/show-equipment/show/${showId}/equipment`, equipmentData);
    return response.data;
  } catch (error) {
    console.error('Error adding equipment to show:', error);
    throw error;
  }
};

// Update show equipment (using validated endpoint)
export const updateShowEquipment = async (id, equipmentData) => {
  try {
    const response = await axios.put(`/api/show-equipment/allocation/${id}`, equipmentData);
    return response.data;
  } catch (error) {
    console.error('Error updating show equipment:', error);
    throw error;
  }
};

// Check out equipment
export const checkoutEquipment = async (id) => {
  try {
    const response = await axios.post(`/api/show-equipment/${id}/checkout`);
    return response.data;
  } catch (error) {
    console.error('Error checking out equipment:', error);
    throw error;
  }
};

// Return equipment
export const returnEquipment = async (id) => {
  try {
    const response = await axios.post(`/api/show-equipment/${id}/return`);
    return response.data;
  } catch (error) {
    console.error('Error returning equipment:', error);
    throw error;
  }
};

// Remove equipment from show
export const removeEquipmentFromShow = async (id) => {
  try {
    const response = await axios.delete(`/api/show-equipment/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error removing equipment from show:', error);
    throw error;
  }
};
