import axios from 'axios';

/**
 * Get all locations
 * @returns {Promise<Object>} The locations
 */
export const getLocations = async () => {
  const response = await axios.get('/api/locations');
  return response.data;
};

/**
 * Get location by ID
 * @param {number} id - Location ID
 * @returns {Promise<Object>} The location
 */
export const getLocationById = async (id) => {
  const response = await axios.get(`/api/locations/${id}`);
  return response.data;
};

/**
 * Create a new location
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} The created location
 */
export const createLocation = async (locationData) => {
  const response = await axios.post('/api/locations', locationData);
  return response.data;
};

/**
 * Update a location
 * @param {number} id - Location ID
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} The updated location
 */
export const updateLocation = async (id, locationData) => {
  const response = await axios.put(`/api/locations/${id}`, locationData);
  return response.data;
};

/**
 * Delete a location
 * @param {number} id - Location ID
 * @returns {Promise<Object>} The response
 */
export const deleteLocation = async (id) => {
  const response = await axios.delete(`/api/locations/${id}`);
  return response.data;
};
