import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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
import AllocateToShowModal from './AllocateToShowModal';
import ShowEquipmentEditModal from './ShowEquipmentEditModal';
import { CardViewIcon, ListViewIcon, EditIcon, TrashIcon } from './Icons';
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
    // Installation fields
    installation_type: 'portable',
    installation_location: '',
    installation_quantity: 0,
    installation_date: '',
    installation_notes: '',
    maintenance_schedule: '',
    last_maintenance_date: '',
    next_maintenance_date: ''
  });

  const [filesToUpload, setFilesToUpload] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAllocationEditModal, setShowAllocationEditModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
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

  // Fetch locations for dropdown and inventory management
  const { data: locationsData, isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/locations');
        // The API returns { locations: [...] }
        return response.data.locations || response.data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        return []; // Return empty array on error
      }
    },
    staleTime: 300000, // 5 minutes
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance', 'unavailable', 'broken'];

  // Fetch show allocations for this equipment (optional - may not exist)
  const { data: showAllocations } = useQuery({
    queryKey: ['show-equipment', id],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/show-equipment/equipment/${id}/shows`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // No allocations found - return empty array
          return [];
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: false, // Don't retry on 404
  });

  // Fetch availability data for this equipment (optional - may not exist)
  const { data: availabilityData } = useQuery({
    queryKey: ['equipment-availability', id],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/show-equipment/equipment/${id}/availability`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // No availability data - return default structure
          return { available: 0, allocated: 0, total: 0 };
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: false, // Don't retry on 404
  });

  // Fetch equipment details
  const { data: equipmentData, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
    onSuccess: (data) => {
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
        // Installation fields
        installation_type: data.installation_type || 'portable',
        installation_location: data.installation_location || '',
        installation_quantity: data.installation_quantity || 0,
        installation_date: data.installation_date || '',
        installation_notes: data.installation_notes || '',
        maintenance_schedule: data.maintenance_schedule || '',
        last_maintenance_date: data.last_maintenance_date || '',
        next_maintenance_date: data.next_maintenance_date || ''
      });

      // Log the location details for debugging
      if (data.locationDetails) {
        console.log('Location details:', data.locationDetails);
      }
    },
  });

  // Get current location details for this equipment (after equipmentData is defined)
  const locationsArray = Array.isArray(locationsData) ? locationsData : [];
  const currentLocation = locationsArray.find(loc =>
    loc.id === equipmentData?.location_id || loc.name === equipmentData?.location
  );

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
      // Comprehensive cache invalidation for all equipment-related queries
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-list'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-summary'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', id] });

      // Force refetch of the main equipment list (infinite query)
      queryClient.refetchQueries({
        queryKey: ['equipment'],
        type: 'active'
      });

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
      const selectedLocation = locationsArray.find(loc => loc.id.toString() === value);

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

        // SIMPLIFIED LOGIC: Only auto-set status for Lager location
        if (isLager) {
          // Lager = storage location = available (unless maintenance/broken)
          if (!['maintenance', 'broken', 'unavailable'].includes(updatedFormData.status)) {
            updatedFormData.status = 'available';
            console.log('Setting status to "available" because location is Lager (storage)');
          }
        }
        // For non-Lager locations, let user choose status manually
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

      // SIMPLIFIED LOGIC: Only auto-set status for Lager location
      if (isLager) {
        // Lager = storage location = available (unless maintenance/broken)
        if (!['maintenance', 'broken', 'unavailable'].includes(updatedFormData.status)) {
          updatedFormData.status = 'available';
          console.log('Setting status to "available" because custom location is Lager (storage)');
        }
      }
      // For non-Lager locations, let user choose status manually
    }

    // Special handling for installation_location_id
    if (name === 'installation_location_id' && value) {
      // Find the installation location name from the selected installation_location_id
      const selectedInstallationLocation = locationsArray.find(loc => loc.id.toString() === value);

      if (selectedInstallationLocation) {
        console.log('Selected installation location:', selectedInstallationLocation);

        // Update both installation_location_id and installation_location name
        updatedFormData = {
          ...updatedFormData,
          installation_location_id: value,
          installation_location: selectedInstallationLocation.name // Set the installation location name
        };
      }
    }
    // Special handling for installation_location field - custom installation location entry
    else if (name === 'installation_location' && value) {
      updatedFormData = {
        ...updatedFormData,
        installation_location: value,
        // Clear installation_location_id when custom installation location is entered
        installation_location_id: ''
      };
    }

    // Special handling for quantity field
    if (name === 'quantity') {
      const quantityValue = parseInt(value) || 1;
      // Ensure minimum quantity is 1
      updatedFormData.quantity = Math.max(1, quantityValue);
      console.log(`Setting quantity to: ${updatedFormData.quantity}`);
    }
    // Special handling for status field - REMOVE FORCED OVERRIDES
    else if (name === 'status') {
      // User manually changes status - ALWAYS respect their choice
      console.log(`User manually changed status to: ${value} - respecting user choice`);
      // No forced overrides - user has full control
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

    // Validate required fields (serial number is now optional)
    if (!formData.type_id || !formData.brand || !formData.model) {
      setError('Type, brand, and model are required');
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
      installation_location_id: formData.installation_location_id ? parseInt(formData.installation_location_id) : null,
      // If reference_image_id is 'new', it will be handled by the backend
      reference_image_id: formData.reference_image_id === 'new' ? 'new' : formData.reference_image_id,
    };

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

  // Handle allocate to show button click
  const handleAllocateToShow = () => {
    setShowAllocateModal(true);
  };

  // Handle edit allocation
  const handleEditAllocation = (allocation) => {
    setEditingAllocation(allocation);
    setShowAllocationEditModal(true);
  };

  // Handle remove allocation
  const handleRemoveAllocation = async (allocation) => {
    if (window.confirm('Are you sure you want to remove this allocation?')) {
      try {
        await axios.delete(`/api/show-equipment/${allocation.id}`);
        queryClient.invalidateQueries(['show-equipment', id]);
        queryClient.invalidateQueries(['equipment-availability', id]);
      } catch (error) {
        console.error('Error removing allocation:', error);
        if (error.response?.status === 404) {
          setError('Allocation not found or already removed');
        } else {
          setError('Failed to remove allocation');
        }
      }
    }
  };

  // Handle allocation edit modal close
  const handleAllocationEditClose = () => {
    setEditingAllocation(null);
    setShowAllocationEditModal(false);
    // Refresh allocations data
    queryClient.invalidateQueries(['show-equipment', id]);
    queryClient.invalidateQueries(['equipment-availability', id]);
  };

  // Calculate missing quantity for allocations
  const calculateMissingQuantity = (needed, allocated) => {
    const neededNum = parseInt(needed) || 0;
    const allocatedNum = parseInt(allocated) || 0;
    return Math.max(0, neededNum - allocatedNum);
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
                  onClick={() => setActiveTab('inventory')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'inventory'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'inventory' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Inventory & Location
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('allocations')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'allocations'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'allocations' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Show Allocations
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
                                label="Serial Number (Optional)"
                                value={formData.serial_number}
                                onChange={handleInputChange}
                                placeholder="Enter serial number (optional)"
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
                                  ...(locationsArray || []).map((location) => {
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
                            <CardViewIcon className="h-4 w-4" />
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
                            <ListViewIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <FileGallery
                        files={equipmentData.files.filter(file =>
                          (!referenceImage || file.id !== referenceImage.id) &&
                          !filesToDelete.includes(file.id)
                        )}
                        layout={layout}
                        size="medium"
                        showDownload={true}
                        canDelete={true}
                        onFileDelete={handleFileDelete}
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

              {/* Inventory & Location Tab - Enhanced Location Management */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Inventory & Location Management</h2>
                  </div>

                  {/* Current Location Section - Editable */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">Storage Location (Editable)</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Location Dropdown */}
                        <div>
                          <Select
                            id="location_id_inventory"
                            name="location_id"
                            label="Select Location"
                            value={formData.location_id ? formData.location_id.toString() : ''}
                            onChange={handleInputChange}
                            options={[
                              { value: '', label: 'Select Location' },
                              ...(locationsArray || []).map((location) => {
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
                        </div>

                        {/* Custom Location Input */}
                        <div>
                          <Input
                            id="location_inventory"
                            name="location"
                            label="Custom Location"
                            value={formData.location || ''}
                            onChange={handleInputChange}
                            placeholder="Enter custom location"
                            helpText="Use this if location is not in the dropdown"
                          />
                        </div>
                      </div>

                      {/* Current Location Display */}
                      {(currentLocation || formData.location) && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Current Location Details
                          </h4>
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="font-medium text-slate-800">
                                {currentLocation?.name || formData.location}
                              </span>
                            </div>
                            {currentLocation && (
                              <>
                                {currentLocation.street && (
                                  <div className="text-slate-600">{currentLocation.street}</div>
                                )}
                                {(currentLocation.postal_code || currentLocation.city) && (
                                  <div className="text-slate-600">
                                    {currentLocation.postal_code && `${currentLocation.postal_code} `}
                                    {currentLocation.city}
                                  </div>
                                )}
                                {(currentLocation.region || currentLocation.country) && (
                                  <div className="text-slate-600">
                                    {currentLocation.region && `${currentLocation.region}, `}
                                    {currentLocation.country}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inventory Summary - Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-slate-800">
                            {formData.quantity || 1}
                          </div>
                          <div className="text-xs text-slate-600">Total Items</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-slate-800">
                            {formData.status === 'available' ? 'Available' : 'In Use'}
                          </div>
                          <div className="text-xs text-slate-600">Current Status</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-2 rounded-lg mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-slate-800">
                            {currentLocation?.name || formData.location || 'Not Set'}
                          </div>
                          <div className="text-xs text-slate-600">Location</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Installation Information Section */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-lg font-medium text-slate-800">Installation Information</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Installation Type */}
                        <div>
                          <Select
                            id="installation_type"
                            name="installation_type"
                            label="Installation Type"
                            value={formData.installation_type || 'portable'}
                            onChange={handleInputChange}
                            options={[
                              { value: 'portable', label: 'Portable - Can be moved freely' },
                              { value: 'semi-permanent', label: 'Semi-Permanent - Can be moved with approval' },
                              { value: 'fixed', label: 'Fixed - Permanently installed' }
                            ]}
                            helpText="Determines if equipment can be allocated to shows"
                          />
                        </div>

                        {/* Maintenance Schedule */}
                        <div>
                          <Select
                            id="maintenance_schedule"
                            name="maintenance_schedule"
                            label="Maintenance Schedule"
                            value={formData.maintenance_schedule || ''}
                            onChange={handleInputChange}
                            options={[
                              { value: '', label: 'No scheduled maintenance' },
                              { value: 'Weekly', label: 'Weekly' },
                              { value: 'Monthly', label: 'Monthly' },
                              { value: 'Quarterly', label: 'Quarterly' },
                              { value: 'Semi-Annually', label: 'Semi-Annually' },
                              { value: 'Annually', label: 'Annually' }
                            ]}
                            helpText="Regular maintenance schedule for this equipment"
                          />
                        </div>
                      </div>

                      {/* Installation Quantity (for fixed/semi-permanent equipment) */}
                      {(formData.installation_type === 'fixed' || formData.installation_type === 'semi-permanent') && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <div className="mb-6">
                            <Input
                              id="installation_quantity"
                              name="installation_quantity"
                              label="Installation Quantity"
                              type="number"
                              min="0"
                              max={formData.quantity || 1}
                              value={formData.installation_quantity || 0}
                              onChange={handleInputChange}
                              helpText={`How many items are permanently installed (max: ${formData.quantity || 1})`}
                              className="w-32"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Select
                                id="installation_location_id"
                                name="installation_location_id"
                                label="Installation Location"
                                value={formData.installation_location_id ? formData.installation_location_id.toString() : ''}
                                onChange={handleInputChange}
                                options={[
                                  { value: '', label: 'Select Installation Location' },
                                  ...(locationsArray || []).map((location) => {
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
                                helpText="Select from predefined locations"
                              />
                              <div className="mt-2">
                                <Input
                                  id="installation_location"
                                  name="installation_location"
                                  label="Custom Installation Location (if not in list)"
                                  value={formData.installation_location || ''}
                                  onChange={handleInputChange}
                                  placeholder="e.g., Main Stage - FOH Position, Booth #3"
                                  helpText="Specific installation position or custom location"
                                />
                              </div>
                            </div>
                            <div>
                              <Input
                                id="installation_date"
                                name="installation_date"
                                label="Installation Date"
                                type="date"
                                value={formData.installation_date || ''}
                                onChange={handleInputChange}
                                helpText="When the equipment was installed"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Maintenance Dates */}
                      {formData.maintenance_schedule && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Input
                                id="last_maintenance_date"
                                name="last_maintenance_date"
                                label="Last Maintenance Date"
                                type="date"
                                value={formData.last_maintenance_date || ''}
                                onChange={handleInputChange}
                                helpText="When maintenance was last performed"
                              />
                            </div>
                            <div>
                              <Input
                                id="next_maintenance_date"
                                name="next_maintenance_date"
                                label="Next Maintenance Date"
                                type="date"
                                value={formData.next_maintenance_date || ''}
                                onChange={handleInputChange}
                                helpText="When next maintenance is due"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Installation Notes */}
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div>
                          <label htmlFor="installation_notes" className="block text-sm font-medium text-slate-700 mb-1">
                            Installation Notes
                          </label>
                          <textarea
                            id="installation_notes"
                            name="installation_notes"
                            value={formData.installation_notes || ''}
                            onChange={handleInputChange}
                            placeholder="Technical notes about installation, access requirements, special considerations..."
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <p className="mt-1 text-sm text-slate-500">Any important notes about the installation or maintenance</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Management Tips */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-1">Location & Installation Tips</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• <strong>Portable:</strong> Can be allocated to shows and moved freely</li>
                          <li>• <strong>Semi-Permanent:</strong> Can be moved with special approval</li>
                          <li>• <strong>Fixed:</strong> Cannot be allocated to shows (permanently installed)</li>
                          <li>• Location "Lager" suggests status "Available" (you can override)</li>
                          <li>• Set maintenance schedules for equipment requiring regular servicing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show Allocations Tab - Read-only with edit/remove actions */}
              {activeTab === 'allocations' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Show Allocations</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto flex items-center"
                      onClick={handleAllocateToShow}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Allocate to Show
                    </Button>
                  </div>

                  {showAllocations && Array.isArray(showAllocations) && showAllocations.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {showAllocations.length} show{showAllocations.length !== 1 ? 's' : ''} using this equipment
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {showAllocations.map((allocation) => (
                          <div key={allocation.id} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-slate-800">{allocation.show_name}</h4>
                                <p className="text-sm text-slate-600">
                                  {allocation.show_date ? new Date(allocation.show_date).toLocaleDateString() : 'No date set'}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  allocation.status === 'requested' ? 'bg-blue-100 text-blue-800' :
                                  allocation.status === 'allocated' ? 'bg-yellow-100 text-yellow-800' :
                                  allocation.status === 'checked-out' ? 'bg-orange-100 text-orange-800' :
                                  allocation.status === 'in-use' ? 'bg-red-100 text-red-800' :
                                  allocation.status === 'returned' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {allocation.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-600">Quantity Needed:</span>
                                <span className="ml-2 font-medium text-slate-800">{allocation.quantity_needed}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">Quantity Allocated:</span>
                                <span className="ml-2 font-medium text-slate-800">{allocation.quantity_allocated}</span>
                              </div>
                            </div>

                            {/* Missing Quantity Display */}
                            {(() => {
                              const missing = calculateMissingQuantity(allocation.quantity_needed, allocation.quantity_allocated);
                              return missing > 0 ? (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-red-600 font-medium">Missing Items:</span>
                                    <span className="font-bold text-red-600">
                                      {missing} item{missing !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            {/* Allocation Actions */}
                            <div className="mt-3 flex items-center justify-end space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAllocation(allocation)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveAllocation(allocation)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </Button>
                            </div>

                            {allocation.notes && (
                              <div className="mt-3 text-sm">
                                <span className="text-slate-600">Notes:</span>
                                <p className="text-slate-800 mt-1 bg-slate-50 p-2 rounded">{allocation.notes}</p>
                              </div>
                            )}

                            {allocation.venue && (
                              <div className="mt-2 text-sm">
                                <span className="text-slate-600">Venue:</span>
                                <span className="ml-2 text-slate-800">{allocation.venue}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-slate-600 font-medium mb-2">No show allocations</p>
                      <p className="text-slate-500 text-sm mb-4">This equipment is not currently allocated to any shows</p>
                      {/* Only show allocate button if we have the necessary APIs */}
                      {typeof handleAllocateToShow === 'function' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAllocateToShow}
                          className="flex items-center mx-auto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Allocate to Show
                        </Button>
                      )}
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

      {/* Allocate to Show Modal */}
      <AllocateToShowModal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        equipment={equipmentData}
        availabilityData={availabilityData}
      />

      {/* Allocation Edit Modal */}
      {editingAllocation && (
        <ShowEquipmentEditModal
          showEquipment={editingAllocation}
          showId={editingAllocation.show_id}
          onClose={handleAllocationEditClose}
        />
      )}
    </form>
  );
};

export default EditEquipmentModern;
