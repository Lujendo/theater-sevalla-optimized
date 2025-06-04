import axios from 'axios';

// Get all equipment types
export const getEquipmentTypes = async () => {
  try {
    const response = await axios.get('/api/equipment-types');
    return response.data; // Return the whole data object which contains 'types' array
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    throw error;
  }
};

// Create new equipment type
export const createEquipmentType = async (name) => {
  const response = await axios.post('/api/equipment-types', { name });
  return response.data;
};

// Update equipment type
export const updateEquipmentType = async (id, name) => {
  const response = await axios.put(`/api/equipment-types/${id}`, { name });
  return response.data;
};

// Delete equipment type
export const deleteEquipmentType = async (id) => {
  const response = await axios.delete(`/api/equipment-types/${id}`);
  return response.data;
};
