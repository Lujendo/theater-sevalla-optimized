import axios from 'axios';

// Get all equipment types
export const getEquipmentTypes = async () => {
  const response = await axios.get('/api/equipment-types');
  return response.data;
};

// Get all equipment with pagination and filters
export const getEquipment = async ({
  page = 1,
  limit = 10,
  type,
  brand,
  status,
  location_id,
  search,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  startDate,
  endDate
}) => {
  const params = { page, limit };

  if (type) params.type = type;
  if (brand) params.brand = brand;
  if (status) params.status = status;
  if (location_id) params.location_id = location_id;
  if (search) params.search = search;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await axios.get('/api/equipment', { params });
  return response.data;
};

// Get equipment by ID
export const getEquipmentById = async (id) => {
  const response = await axios.get(`/api/equipment/${id}`);
  return response.data;
};

// Create new equipment
export const createEquipment = async (equipmentData, files = [], referenceImageFile = null) => {
  // Handle form data with files
  const formData = new FormData();

  // Ensure required fields are present
  if (!equipmentData.type_id) {
    console.error('Missing required field: type_id');
    throw new Error('Equipment type is required');
  }

  if (!equipmentData.brand) {
    console.error('Missing required field: brand');
    throw new Error('Brand is required');
  }

  if (!equipmentData.model) {
    console.error('Missing required field: model');
    throw new Error('Model is required');
  }

  if (!equipmentData.serial_number) {
    console.error('Missing required field: serial_number');
    throw new Error('Serial number is required');
  }

  // Create a clean copy of the equipment data without any undefined values
  const cleanEquipmentData = Object.fromEntries(
    Object.entries(equipmentData).filter(([_, v]) => v !== undefined)
  );

  // Log the data being sent
  console.log('Creating equipment with data:', cleanEquipmentData);

  // Add equipment data
  Object.keys(cleanEquipmentData).forEach(key => {
    // Convert type_id to a number if it's a string
    if (key === 'type_id' && typeof cleanEquipmentData[key] === 'string') {
      formData.append(key, parseInt(cleanEquipmentData[key], 10));
    } else {
      formData.append(key, cleanEquipmentData[key]);
    }
  });

  // Add reference image if provided
  if (referenceImageFile) {
    formData.append('referenceImage', referenceImageFile);
  }

  // Add regular files if any
  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('files', file);
    });
  }

  try {
    const response = await axios.post('/api/equipment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in createEquipment:', error);
    throw error;
  }
};

// Update equipment
export const updateEquipment = async (id, equipmentData, files = [], filesToDelete = [], referenceImageFile = null, removeReferenceImage = false) => {
  try {
    // Handle form data with files
    const formData = new FormData();

    // Create a clean copy of the equipment data without any undefined values
    // Note: We need to include empty strings as they can be valid values (e.g., clearing a field)
    const cleanEquipmentData = Object.fromEntries(
      Object.entries(equipmentData).filter(([_, v]) => v !== undefined)
    );

    // Log the full equipment data for debugging
    console.log('Full equipment data:', equipmentData);

    // Handle special fields that need to be null instead of empty string
    const integerFields = ['location_id', 'type_id'];

    // Add equipment data
    Object.keys(cleanEquipmentData).forEach(key => {
      // Skip reference_image_id - we'll handle it separately
      if (key !== 'reference_image_id') {
        // For integer fields, convert empty strings to null
        if (integerFields.includes(key) && (cleanEquipmentData[key] === '' || cleanEquipmentData[key] === '0')) {
          formData.append(key, '');
          // Add a special flag to indicate this should be treated as NULL
          formData.append(`${key}_is_null`, 'true');
        } else {
          formData.append(key, cleanEquipmentData[key]);
        }
      }
    });

    // Add reference image if provided
    if (referenceImageFile) {
      formData.append('referenceImage', referenceImageFile);
    }

    // Flag to remove reference image
    if (removeReferenceImage) {
      formData.append('removeReferenceImage', 'true');
    }

    // Add regular files if any
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    // Add filesToDelete if present
    if (filesToDelete && filesToDelete.length > 0) {
      formData.append('filesToDelete', JSON.stringify(filesToDelete));
    }

    console.log('Updating equipment with data:', cleanEquipmentData);
    console.log('Files to delete:', filesToDelete);
    console.log('Reference image file:', referenceImageFile ? referenceImageFile.name : 'None');
    console.log('Remove reference image:', removeReferenceImage);

    const response = await axios.put(`/api/equipment/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateEquipment:', error);
    throw error;
  }
};

// Delete equipment
export const deleteEquipment = async (id) => {
  const response = await axios.delete(`/api/equipment/${id}`);
  return response.data;
};

// Delete file
export const deleteFile = async (id) => {
  try {
    console.log(`Deleting file with ID: ${id}`);
    const response = await axios.delete(`/api/files/${id}`);
    console.log('File deletion response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error deleting file with ID ${id}:`, error);
    throw error;
  }
};

// Get file URL
export const getFileUrl = (id, useThumbnail = false, addTimestamp = true) => {
  if (!id) return null;

  const baseUrl = `/api/files/${id}`;
  let url = useThumbnail ? `${baseUrl}?thumbnail=true` : baseUrl;

  // Add timestamp to prevent caching issues
  if (addTimestamp) {
    url += (url.includes('?') ? '&' : '?') + `t=${new Date().getTime()}`;
  }

  return url;
};

// Duplicate equipment
export const duplicateEquipment = async (id) => {
  try {
    // First, get the equipment details
    const equipment = await getEquipmentById(id);
    console.log('Duplicating equipment:', equipment);

    // Prepare the data for the new equipment
    // We'll modify the serial number to indicate it's a duplicate
    const duplicateData = {
      type_id: equipment.type_id,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: `${equipment.serial_number}-COPY-${Date.now().toString().slice(-4)}`,
      status: equipment.status,
      location: equipment.location,
      location_id: equipment.location_id,
      description: equipment.description
    };

    // Create the new equipment
    const newEquipment = await createEquipment(duplicateData);

    // If the original equipment had a reference image, copy it to the new equipment
    if (equipment.reference_image_id) {
      try {
        // Get the reference image file
        const referenceImageResponse = await axios.get(`/api/files/${equipment.reference_image_id}`, {
          responseType: 'blob'
        });

        // Create a file object from the blob
        const referenceImageBlob = referenceImageResponse.data;
        const referenceImageFile = new File(
          [referenceImageBlob],
          equipment.files?.find(f => f.id === equipment.reference_image_id)?.file_name || 'reference-image.jpg',
          { type: referenceImageBlob.type }
        );

        // Update the new equipment with the reference image
        await updateEquipment(
          newEquipment.id,
          { ...newEquipment },
          [],
          [],
          referenceImageFile
        );

        console.log('Reference image copied to new equipment');
      } catch (imageError) {
        console.error('Error copying reference image:', imageError);
        // Continue even if reference image copy fails
      }
    }

    // Get the updated equipment with all files
    const updatedEquipment = await getEquipmentById(newEquipment.id);
    return updatedEquipment;
  } catch (error) {
    console.error('Error in duplicateEquipment:', error);
    throw error;
  }
};

// Update equipment status
export const updateEquipmentStatus = async (id, status) => {
  try {
    console.log(`Updating equipment ${id} status to ${status}`);
    const response = await axios.patch(`/api/equipment/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating equipment status:', error);
    throw error;
  }
};

// Update equipment location
export const updateEquipmentLocation = async (id, locationData) => {
  try {
    console.log(`Updating equipment ${id} location:`, locationData);
    const response = await axios.patch(`/api/equipment/${id}/location`, locationData);
    return response.data;
  } catch (error) {
    console.error('Error updating equipment location:', error);
    throw error;
  }
};

// Update equipment type
export const updateEquipmentType = async (id, typeId) => {
  try {
    console.log(`Updating equipment ${id} type to ${typeId}`);
    const response = await axios.patch(`/api/equipment/${id}/type`, { type_id: typeId });
    return response.data;
  } catch (error) {
    console.error('Error updating equipment type:', error);
    throw error;
  }
};

// Update equipment category
export const updateEquipmentCategory = async (id, categoryId) => {
  try {
    console.log(`Updating equipment ${id} category to ${categoryId}`);
    const response = await axios.patch(`/api/equipment/${id}/category`, { category_id: categoryId });
    return response.data;
  } catch (error) {
    console.error('Error updating equipment category:', error);
    throw error;
  }
};

// Update equipment brand and model
export const updateEquipmentBrandModel = async (id, updateData) => {
  try {
    console.log(`Updating equipment ${id} brand/model:`, updateData);
    const response = await axios.patch(`/api/equipment/${id}/brand-model`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating equipment brand/model:', error);
    throw error;
  }
};