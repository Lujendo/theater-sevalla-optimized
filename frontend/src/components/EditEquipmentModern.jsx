import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, updateEquipment, deleteFile } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import EquipmentForm from './EquipmentForm';
import FileDeleteTest from './FileDeleteTest';
import { Button } from './ui';

const EditEquipmentModern = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    type_id: '',
    category_id: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
    location_id: '',
    description: '',
    reference_image_id: '',
  });

  const [filesToUpload, setFilesToUpload] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  // Fetch equipment types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 300000, // 5 minutes
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance'];

  // Fetch equipment details
  const { data: equipmentData, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
    onSuccess: (data) => {
      console.log('Equipment data loaded:', data);
      console.log('Location ID:', data.location_id, typeof data.location_id);
      setFormData({
        type_id: data.type_id ? data.type_id.toString() : '',
        category_id: data.category_id ? data.category_id.toString() : '',
        category: data.category || '',
        brand: data.brand || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        status: data.status || 'available',
        location: data.location || '',
        location_id: data.location_id ? data.location_id.toString() : '',
        description: data.description || '',
        reference_image_id: data.reference_image_id ? data.reference_image_id.toString() : '',
      });

      // Log the location details for debugging
      if (data.locationDetails) {
        console.log('Location details:', data.locationDetails);
      }
    },
  });

  // Update equipment mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Create a clean copy of the equipment data without any undefined or null values
      const cleanEquipmentData = Object.fromEntries(
        Object.entries(data.equipment).filter(([_, v]) => v !== undefined && v !== null)
      );

      // Use the updated service function
      return updateEquipment(id, cleanEquipmentData, data.filesToUpload, data.filesToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate(`/equipment/${id}`);
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      setError(error.response?.data?.message || 'Failed to update equipment');
    },
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Create a copy of the current form data
    let updatedFormData = { ...formData, [name]: value };

    // Special handling for category_id
    if (name === 'category_id' && value && categoriesData?.categories) {
      // Find the category name from the selected category_id
      const selectedCategory = categoriesData.categories.find(cat => cat.id.toString() === value);

      if (selectedCategory) {
        console.log('Selected category:', selectedCategory);

        // Update both category_id and category name
        updatedFormData = {
          ...updatedFormData,
          category_id: value,
          category: selectedCategory.name // Set the category name
        };
      }
    }

    // Special handling for location_id
    if (name === 'location_id' && value) {
      // Find the location name from the selected location_id
      const selectedLocation = locationsData?.locations.find(loc => loc.id.toString() === value);

      if (selectedLocation) {
        console.log('Selected location:', selectedLocation);

        // Update both location_id and location name
        updatedFormData = {
          ...updatedFormData,
          location_id: value,
          location: selectedLocation.name // Set the location name
        };

        // Check if the location is "Lager" (case insensitive)
        const isLager = selectedLocation.name.toLowerCase() === 'lager';

        // Update status based on location
        if (isLager) {
          // If location is Lager, set status to "available"
          updatedFormData.status = 'available';
          console.log('Setting status to "available" because location is Lager');
        } else if (updatedFormData.status === 'available') {
          // If location is not Lager and status is "available", set status to "in-use"
          updatedFormData.status = 'in-use';
          console.log(`Setting status to "in-use" because location is not Lager (${selectedLocation.name})`);
        }
      }
    }
    // Special handling for location field - custom location entry
    else if (name === 'location' && value) {
      updatedFormData = {
        ...updatedFormData,
        location: value,
        // Clear location_id when custom location is entered
        location_id: ''
      };

      // Check if the location is "Lager" (case insensitive)
      const isLager = value.toLowerCase() === 'lager';

      // Update status based on location
      if (isLager) {
        // If location is Lager, set status to "available"
        updatedFormData.status = 'available';
        console.log('Setting status to "available" because custom location is Lager');
      } else if (updatedFormData.status === 'available') {
        // If location is not Lager and status is "available", set status to "in-use"
        updatedFormData.status = 'in-use';
        console.log(`Setting status to "in-use" because custom location is not Lager (${value})`);
      }
    }

    // Special handling for status field
    if (name === 'status') {
      // If user manually changes status, respect their choice
      console.log(`User manually changed status to: ${value}`);

      // But if location is "Lager", force status to "available"
      const locationName = formData.location || '';
      const isLager = locationName.toLowerCase() === 'lager';

      if (isLager && value !== 'available') {
        console.log('Forcing status back to "available" because location is Lager');
        updatedFormData.status = 'available';
      }
    }

    // Update the form data
    setFormData(updatedFormData);
  };

  // Handle file selection
  const handleFileChange = (selectedFiles) => {
    setFilesToUpload(selectedFiles);
  };

  // Handle file deletion
  const handleFileDelete = (fileId) => {
    // If the deleted file is the reference image, clear the reference_image_id
    if (formData.reference_image_id === fileId.toString()) {
      setFormData({
        ...formData,
        reference_image_id: '',
      });
    }
    setFilesToDelete(prev => [...prev, fileId]);
  };

  // Handle setting reference image
  const handleSetReferenceImage = (fileId) => {
    setFormData({
      ...formData,
      reference_image_id: fileId.toString(),
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.type_id || !formData.brand || !formData.model || !formData.serial_number) {
      setError('Type, brand, model, and serial number are required');
      return;
    }

    // Check if there's a new reference image file
    const referenceImageFile = filesToUpload.find((_, index) => formData.reference_image_id === 'new');

    // Remove the reference image from filesToUpload if it exists
    const regularFiles = referenceImageFile
      ? filesToUpload.filter(file => file !== referenceImageFile)
      : filesToUpload;

    // Determine if we need to remove the reference image
    const removeReferenceImage = formData.reference_image_id === '';

    updateMutation.mutate({
      equipment: {
        ...formData,
        // If reference_image_id is 'new', it will be handled by the backend
        reference_image_id: formData.reference_image_id === 'new' ? 'new' : formData.reference_image_id,
      },
      filesToUpload: regularFiles,
      filesToDelete,
      referenceImageFile: referenceImageFile || null,
      removeReferenceImage,
    });
  };

  // Cancel edit
  const handleCancel = () => {
    navigate(`/equipment/${id}`);
  };

  if (isLoading) {
    return (
      <>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Edit Equipment</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Edit Equipment</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading equipment</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{fetchError?.message || 'Failed to load equipment details'}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/equipment')}
                >
                  Back to Equipment List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Direct file deletion handler
  const handleDirectFileDelete = async (fileId) => {
    try {
      console.log(`Directly deleting file with ID: ${fileId}`);
      await deleteFile(fileId);
      console.log('File deleted successfully');
      queryClient.invalidateQueries(['equipment', id]);
    } catch (err) {
      console.error('Error directly deleting file:', err);
      setError(`Error deleting file: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Edit Equipment</h1>
      </div>

      {/* File Delete Test Component */}
      {user?.role === 'admin' && (
        <div className="mb-6">
          <FileDeleteTest />
        </div>
      )}

      <EquipmentForm
        formData={formData}
        equipmentTypes={typesData?.types || []}
        categoriesData={categoriesData?.categories || []}
        statusOptions={statusOptions}
        handleInputChange={handleInputChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
        isLoading={updateMutation.isLoading}
        error={error}
        isEditing={true}
        uploadProgress={uploadProgress}
        existingFiles={equipmentData?.files || []}
        handleFileDelete={handleFileDelete}
        handleSetReferenceImage={handleSetReferenceImage}
      />

      {/* Display existing files with direct delete buttons */}
      {user?.role === 'admin' && equipmentData?.files && equipmentData.files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Direct File Deletion Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentData.files.map(file => (
              <div key={file.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-sm text-slate-500">ID: {file.id}</p>
                    <p className="text-sm text-slate-500">Type: {file.file_type}</p>
                  </div>
                  <button
                    onClick={() => handleDirectFileDelete(file.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete Directly
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditEquipmentModern;
