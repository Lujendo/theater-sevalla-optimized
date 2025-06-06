import axios from 'axios';

// Get all saved searches for the current user
export const getSavedSearches = async () => {
  try {
    const response = await axios.get('/api/saved-searches');
    return { searches: response.data || [] };
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    // Return empty array instead of throwing error to prevent UI crashes
    return { searches: [] };
  }
};

// Save a new search
export const saveSearch = async (searchData) => {
  try {
    const response = await axios.post('/api/saved-searches', searchData);
    return response.data;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
};

// Delete a saved search
export const deleteSavedSearch = async (id) => {
  try {
    const response = await axios.delete(`/api/saved-searches/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    throw error;
  }
};

// Get a specific saved search by ID
export const getSavedSearch = async (id) => {
  try {
    const response = await axios.get(`/api/saved-searches/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching saved search with ID ${id}:`, error);
    return null;
  }
};

// Get the default saved search for the current user
export const getDefaultSavedSearch = async () => {
  try {
    const { searches } = await getSavedSearches();
    return searches.find(search => search.is_default) || null;
  } catch (error) {
    console.error('Error fetching default saved search:', error);
    return null;
  }
};
