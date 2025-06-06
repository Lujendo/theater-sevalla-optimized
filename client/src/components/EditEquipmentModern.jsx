import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, updateEquipment, deleteFile } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getCategories } from '../services/categoryService';
import { getLocations } from '../services/locationService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Select, Badge } from './ui';
import ReferenceImageModal from './ReferenceImageModal';
import EquipmentLogList from './EquipmentLogList';
import FileGallery from './FileGallery';
import FileUploadModal from './FileUploadModal';
import { toast } from 'react-toastify';

// Helper function to get file URL
const getFileUrl = (fileId, thumbnail = false) => {
  return `/api/files/${fileId}${thumbnail ? '?thumbnail=true' : ''}`;
};

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
    quantity: 1, // Default quantity is 1
  });

  const [filesToUpload, setFilesToUpload] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [layout, setLayout] = useState('grid');

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

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000, // 5 minutes
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance', 'unavailable', 'broken'];

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
        quantity: data.quantity || 1, // Default to 1 if not set
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

    // Special handling for quantity field
    if (name === 'quantity') {
      const quantityValue = parseInt(value) || 1;
      // Ensure minimum quantity is 1
      updatedFormData.quantity = Math.max(1, quantityValue);
      console.log(`Setting quantity to: ${updatedFormData.quantity}`);
    }
    // Special handling for status field
    else if (name === 'status') {
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

    // Prepare equipment data with proper data types
    const equipmentData = {
      ...formData,
      // Ensure quantity is a number
      quantity: parseInt(formData.quantity) || 1,
      // Ensure IDs are numbers if they exist
      type_id: formData.type_id ? parseInt(formData.type_id) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      location_id: formData.location_id ? parseInt(formData.location_id) : null,
      // If reference_image_id is 'new', it will be handled by the backend
      reference_image_id: formData.reference_image_id === 'new' ? 'new' : formData.reference_image_id,
    };

    console.log('Submitting equipment data:', equipmentData);

    updateMutation.mutate({
      equipment: equipmentData,
      filesToUpload: regularFiles,
      filesToDelete,
      referenceImageFile: referenceImageFile || null,
      removeReferenceImage,
    });
  };

  // Cancel edit - go back to Details
  const handleCancel = () => {
    navigate(`/equipment/${id}`);
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'in-use':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'unavailable':
        return 'secondary';
      case 'broken':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Handle file upload success
  const handleFileUploadSuccess = (files) => {
    // Invalidate the equipment query to refetch with the new files
    queryClient.invalidateQueries(['equipment', id]);
    toast.success(`Successfully uploaded ${files.length} file(s)`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Edit Equipment</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
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
                  onClick={handleCancel}
                >
                  Back to Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
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

  // Convert reference_image_id to number for proper comparison
  const refImageId = equipmentData?.reference_image_id ? parseInt(equipmentData.reference_image_id) : null;

  // Check if reference image exists in files
  const referenceImage = equipmentData?.files?.find(file => file.id === refImageId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section - Same as Details but with Save/Cancel buttons */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Equipment</h1>
            <p className="text-slate-500 text-sm">
              {formData.brand} {formData.model} • {formData.serial_number}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Details
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isLoading}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Grid layout for main content - Same structure as Details but with form inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left column - Equipment Information Tabs (Editable) */}
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'details'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'details' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'documents' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Documents & Attachments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'history' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Movement History
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Details Tab - Editable Form Fields */}
              {activeTab === 'details' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    {/* Main Information - Editable */}
                    <div className="md:col-span-1">
                      <Card className="h-full">
                        <Card.Header className="bg-slate-50">
                          <Card.Title className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Equipment Information
                          </Card.Title>
                        </Card.Header>
                        <Card.Body>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Category */}
                            <div>
                              <Select
                                id="category_id"
                                name="category_id"
                                label="Category"
                                value={formData.category_id || ''}
                                onChange={handleInputChange}
                                options={[
                                  { value: '', label: 'Select Category' },
                                  ...(categoriesData?.categories || []).map((category) => ({
                                    value: category.id.toString(),
                                    label: category.name,
                                  }))
                                ]}
                              />
                            </div>

                            {/* Type */}
                            <div>
                              <Select
                                id="type_id"
                                name="type_id"
                                label="Type"
                                value={formData.type_id || ''}
                                onChange={handleInputChange}
                                options={[
                                  { value: '', label: 'Select Type' },
                                  ...(typesData?.types || []).map((type) => ({
                                    value: type.id.toString(),
                                    label: type.name,
                                  }))
                                ]}
                                required
                              />
                            </div>

                            {/* Brand */}
                            <div>
                              <Input
                                id="brand"
                                name="brand"
                                label="Brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                placeholder="Enter brand"
                                required
                              />
                            </div>

                            {/* Model */}
                            <div>
                              <Input
                                id="model"
                                name="model"
                                label="Model"
                                value={formData.model}
                                onChange={handleInputChange}
                                placeholder="Enter model"
                                required
                              />
                            </div>

                            {/* Serial Number */}
                            <div>
                              <Input
                                id="serial_number"
                                name="serial_number"
                                label="Serial Number"
                                value={formData.serial_number}
                                onChange={handleInputChange}
                                placeholder="Enter serial number"
                                required
                              />
                            </div>

                            {/* Status */}
                            <div>
                              <Select
                                id="status"
                                name="status"
                                label="Status"
                                value={formData.status}
                                onChange={handleInputChange}
                                options={statusOptions.map((status) => ({
                                  value: status,
                                  label: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
                                }))}
                                required
                              />
                            </div>

                            {/* Quantity */}
                            <div>
                              <Input
                                id="quantity"
                                name="quantity"
                                label="Quantity"
                                type="number"
                                min="1"
                                value={formData.quantity || 1}
                                onChange={handleInputChange}
                                placeholder="Enter quantity"
                                required
                                helpText="Number of items (minimum: 1)"
                              />
                            </div>

                            {/* Location */}
                            <div>
                              <Select
                                id="location_id"
                                name="location_id"
                                label="Location"
                                value={formData.location_id ? formData.location_id.toString() : ''}
                                onChange={handleInputChange}
                                options={[
                                  { value: '', label: 'Select Location' },
                                  ...(locationsData?.locations || []).map((location) => {
                                    let label = location.name;
                                    const addressParts = [];

                                    if (location.city) addressParts.push(location.city);
                                    if (location.region) addressParts.push(location.region);
                                    if (location.country) addressParts.push(location.country);

                                    if (addressParts.length > 0) {
                                      label += ` (${addressParts.join(', ')})`;
                                    }

                                    return {
                                      value: location.id.toString(),
                                      label: label,
                                    };
                                  })
                                ]}
                              />
                              <div className="mt-2">
                                <Input
                                  id="location"
                                  name="location"
                                  label="Custom Location (if not in list)"
                                  value={formData.location || ''}
                                  onChange={handleInputChange}
                                  placeholder="Enter custom location"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mt-8 border-t border-slate-200 pt-6">
                            <div className="flex items-center mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                              <label htmlFor="description" className="text-sm font-medium text-slate-700">Description</label>
                            </div>
                            <textarea
                              id="description"
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              rows="4"
                              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              placeholder="Enter description"
                            ></textarea>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents & Attachments Tab - Same as Details but editable */}
              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Documents & Attachments</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto flex items-center"
                      onClick={() => setShowFileUploadModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Documents
                    </Button>
                  </div>

                  {equipmentData?.files && equipmentData.files.filter(file => !referenceImage || file.id !== referenceImage.id).length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {equipmentData.files.filter(file => !referenceImage || file.id !== referenceImage.id).length}
                            {equipmentData.files.filter(file => !referenceImage || file.id !== referenceImage.id).length === 1 ? ' file' : ' files'} attached
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'grid'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('grid')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'list'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('list')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <FileGallery
                        files={equipmentData.files.filter(file => !referenceImage || file.id !== referenceImage.id)}
                        layout={layout}
                        size="medium"
                        showDownload={true}
                        canDelete={true}
                        onDelete={handleFileDelete}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium mb-2">No documents attached to this equipment</p>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center mx-auto"
                          onClick={() => setShowFileUploadModal(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Documents
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Movement History Tab - Read-only */}
              {activeTab === 'history' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Movement History</h2>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                    <div className="mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">
                        Equipment movement log
                      </span>
                    </div>

                    <EquipmentLogList equipmentId={id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Reference Image (Editable) */}
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reference Image
              </h2>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              {referenceImage ? (
                <div className="w-full">
                  <div className="relative pb-4">
                    <img
                      src={getFileUrl(referenceImage.id, true)}
                      alt={`${formData.brand} ${formData.model}`}
                      className="w-full h-auto object-contain rounded-md"
                      onError={(e) => {
                        console.error('Error loading thumbnail, falling back to original image');
                        e.target.src = getFileUrl(referenceImage.id);
                        e.target.onerror = null;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowReferenceImageModal(true)}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                      title="Change reference image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    {referenceImage.file_name}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No reference image</p>
                  <button
                    type="button"
                    onClick={() => setShowReferenceImageModal(true)}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reference Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Quick Info and Metadata (Read-only preview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Info Preview */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 h-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick Info Preview
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Category</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{formData.category || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Type</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{typesData?.types?.find(t => t.id.toString() === formData.type_id)?.name || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                </div>
                <div>
                  {formData.status && (
                    <Badge variant={getStatusVariant(formData.status)} size="md">
                      {formData.status.charAt(0).toUpperCase() + formData.status.slice(1).replace('-', ' ')}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Quantity</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{formData.quantity || 1} item{(formData.quantity || 1) !== 1 ? 's' : ''}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Location</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{formData.location || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Serial Number</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{formData.serial_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata - Read-only */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <Card.Header className="bg-slate-50">
              <Card.Title className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Metadata
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created By</h4>
                    <p className="mt-1 text-sm text-slate-600">{equipmentData?.created_by || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created At</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipmentData?.created_at ? new Date(equipmentData.created_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Last Updated</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipmentData?.updated_at ? new Date(equipmentData.updated_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ReferenceImageModal
        isOpen={showReferenceImageModal}
        onClose={() => setShowReferenceImageModal(false)}
        equipmentId={id}
        existingImage={referenceImage}
      />

      <FileUploadModal
        equipmentId={parseInt(id)}
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onSuccess={handleFileUploadSuccess}
      />
    </form>
  );
};

export default EditEquipmentModern;
