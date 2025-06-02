import axios from 'axios';

/**
 * Upload files for a specific equipment
 * 
 * @param {number} equipmentId - The ID of the equipment to upload files for
 * @param {File[]} files - Array of files to upload
 * @param {Function} onUploadProgress - Optional callback for upload progress
 * @returns {Promise<Object>} - The response data
 */
export const uploadFilesForEquipment = async (equipmentId, files, onUploadProgress) => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Add files to form data
    for (const file of files) {
      formData.append('files', file);
    }
    
    // Upload files
    const response = await axios.post(`/api/files/upload/${equipmentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onUploadProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      } : undefined
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

/**
 * Delete a file
 * 
 * @param {number} fileId - The ID of the file to delete
 * @returns {Promise<Object>} - The response data
 */
export const deleteFile = async (fileId) => {
  try {
    const response = await axios.delete(`/api/files/${fileId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Get file metadata
 * 
 * @param {number} fileId - The ID of the file to get metadata for
 * @returns {Promise<Object>} - The file metadata
 */
export const getFileMetadata = async (fileId) => {
  try {
    const response = await axios.get(`/api/files/${fileId}/metadata`);
    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};
