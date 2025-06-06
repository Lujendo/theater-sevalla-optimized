import axios from 'axios';

/**
 * Export equipment data in the specified format
 * @param {string} format - Export format (csv, xlsx, json)
 * @param {Object} filters - Filters to apply to the export
 * @returns {Promise<Blob>} - Exported data as a Blob
 */
export const exportEquipment = async (format = 'csv', filters = {}) => {
  try {
    // Build query parameters
    const params = { format };

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      // Handle selectedIds specially - convert to JSON string
      if (key === 'selectedIds' && Array.isArray(value) && value.length > 0) {
        params.selectedIds = JSON.stringify(value);
      } else {
        params[key] = value;
      }
    });

    console.log('Export params:', params);

    // Make request with responseType blob to handle file download
    const response = await axios.get('/api/import-export/export', {
      params,
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error exporting equipment:', error);
    throw error;
  }
};

/**
 * Import equipment data from a file
 * @param {File} file - File to import
 * @param {Object} options - Import options
 * @returns {Promise<Object>} - Import results
 */
export const importEquipment = async (file, options = {}) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add options
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Make request
    const response = await axios.post('/api/import-export/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error importing equipment:', error);
    throw error;
  }
};

/**
 * Download a blob as a file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename to use
 */
export const downloadBlob = (blob, filename) => {
  // Create a URL for the blob
  const url = window.URL.createObjectURL(blob);

  // Create a link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to the document
  document.body.appendChild(link);

  // Trigger click
  link.click();

  // Clean up
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
};
