import axios from 'axios';

/**
 * Get all categories
 * @returns {Promise<Object>} Object with categories array
 */
export const getCategories = async () => {
  try {
    const response = await axios.get('/api/categories');
    // Wrap the array in an object with a categories property to match the expected structure
    return { categories: response.data };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { categories: [] }; // Return empty array on error
  }
};

/**
 * Create a new category
 * @param {string} name - Category name
 * @param {string} description - Category description (optional)
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (name, description = '') => {
  const response = await axios.post('/api/categories', { name, description });
  return response.data;
};

/**
 * Update a category
 * @param {number} id - Category ID
 * @param {string} name - New category name
 * @param {string} description - New category description (optional)
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (id, name, description = '') => {
  const response = await axios.put(`/api/categories/${id}`, { name, description });
  return response.data;
};

/**
 * Delete a category
 * @param {number} id - Category ID
 * @returns {Promise<Object>} Response data
 */
export const deleteCategory = async (id) => {
  const response = await axios.delete(`/api/categories/${id}`);
  return response.data;
};
