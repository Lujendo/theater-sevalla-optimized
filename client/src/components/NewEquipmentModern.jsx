import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import EquipmentForm from './EquipmentForm';
import { Card, Button } from './ui';
import axios from 'axios';

const NewEquipmentModern = () => {
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
    installation_location_id: '',
    installation_quantity: 0,
    installation_date: '',
    installation_notes: '',
    maintenance_schedule: '',
    last_maintenance_date: '',
    next_maintenance_date: ''
  });

  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAllocationOptions, setShowAllocationOptions] = useState(false);
  const [allocationData, setAllocationData] = useState({
    allocationType: 'storage', // 'storage', 'show', 'location', 'installation'
    showId: '',
    locationId: '',
    quantity: 1,
    // Installation-specific fields
    installationType: 'portable',
    installationLocationId: '',
    installationLocation: '',
    installationDate: '',
    installationNotes: '',
    maintenanceSchedule: ''
  });

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

  // Fetch default storage locations
  const { data: defaultStorageData } = useQuery({
    queryKey: ['default-storage-locations'],
    queryFn: async () => {
      const response = await axios.get('/api/default-storage-locations');
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch shows for allocation dropdown
  const { data: showsData } = useQuery({
    queryKey: ['shows'],
    queryFn: async () => {
      const response = await axios.get('/api/shows');
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    enabled: showAllocationOptions && allocationData.allocationType === 'show'
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance', 'unavailable', 'broken'];

  // Set default storage location automatically when default storage data is loaded
  useEffect(() => {
    if (defaultStorageData?.defaultStorageLocations?.length > 0 && !formData.location_id) {
      const defaultStorage = defaultStorageData.defaultStorageLocations[0]; // First one has highest priority
      console.log('🏪 Setting default storage location:', defaultStorage);

      setFormData(prev => ({
        ...prev,
        location_id: defaultStorage.location_id.toString(),
        location: defaultStorage.location?.name || defaultStorage.name || 'Default Storage',
        status: 'available' // Default to available for storage location
      }));
    }
  }, [defaultStorageData, formData.location_id]);

  // Also set default location when locations data is loaded (fallback)
  useEffect(() => {
    if (locationsData?.locations?.length > 0 && !formData.location_id && !defaultStorageData?.defaultStorageLocations?.length) {
      // Find a location that might be a default storage (look for keywords)
      const defaultLocation = locationsData.locations.find(location =>
        location.name?.toLowerCase().includes('storage') ||
        location.name?.toLowerCase().includes('lager') ||
        location.name?.toLowerCase().includes('warehouse') ||
        location.name?.toLowerCase().includes('depot')
      ) || locationsData.locations[0]; // Fallback to first location

      console.log('🏪 Setting fallback default location:', defaultLocation);

      setFormData(prev => ({
        ...prev,
        location_id: defaultLocation.id.toString(),
        location: defaultLocation.name,
        status: 'available'
      }));
    }
  }, [locationsData, formData.location_id, defaultStorageData]);

  // Override form location and quantity based on allocation choices
  useEffect(() => {
    if (!showAllocationOptions) return;

    let shouldUpdateLocation = false;
    let newLocationId = '';
    let newLocation = '';
    let newStatus = formData.status;

    // Handle different allocation types
    switch (allocationData.allocationType) {
      case 'storage':
        // Keep default storage location - no override needed
        break;

      case 'show':
        // For show allocation, keep equipment in storage but mark as allocated
        // Location stays as storage, but status changes to reflect allocation
        if (allocationData.showId) {
          newStatus = 'in-use'; // Equipment allocated to show
          console.log('📺 Equipment allocated to show - status set to in-use');
        }
        break;

      case 'location':
        // Override location to the allocated location
        if (allocationData.locationId) {
          const selectedLocation = locationsData?.locations?.find(loc => loc.id.toString() === allocationData.locationId);
          if (selectedLocation) {
            shouldUpdateLocation = true;
            newLocationId = allocationData.locationId;
            newLocation = selectedLocation.name;
            newStatus = 'in-use'; // Equipment at specific location
            console.log('📍 Overriding location to allocated location:', selectedLocation.name);
          }
        }
        break;

      case 'installation':
        // Override location to the installation location
        if (allocationData.installationLocationId) {
          const selectedLocation = locationsData?.locations?.find(loc => loc.id.toString() === allocationData.installationLocationId);
          if (selectedLocation) {
            shouldUpdateLocation = true;
            newLocationId = allocationData.installationLocationId;
            newLocation = selectedLocation.name;
            newStatus = 'in-use'; // Installed equipment is in-use
            console.log('🔧 Overriding location to installation location:', selectedLocation.name);
          }
        } else if (allocationData.installationLocation) {
          shouldUpdateLocation = true;
          newLocationId = '';
          newLocation = allocationData.installationLocation;
          newStatus = 'in-use'; // Installed equipment is in-use
          console.log('🔧 Overriding location to custom installation location:', allocationData.installationLocation);
        }
        break;
    }

    // Handle quantity override for partial allocations
    let shouldUpdateQuantity = false;
    let newQuantity = formData.quantity;

    // For location and installation allocations, if quantity is less than total,
    // we need to consider if we should override the main quantity
    if ((allocationData.allocationType === 'location' || allocationData.allocationType === 'installation') &&
        allocationData.quantity > 0 && allocationData.quantity < (formData.quantity || 1)) {
      // For partial allocations, keep the original quantity but note the allocation
      // The backend will handle creating the allocation record
      console.log(`📊 Partial allocation: ${allocationData.quantity} of ${formData.quantity} items`);
    } else if ((allocationData.allocationType === 'location' || allocationData.allocationType === 'installation') &&
               allocationData.quantity === (formData.quantity || 1)) {
      // For full allocations, the location override is sufficient
      console.log(`📊 Full allocation: all ${allocationData.quantity} items allocated`);
    }

    // Update form data if location should be overridden
    if (shouldUpdateLocation || newStatus !== formData.status || shouldUpdateQuantity) {
      setFormData(prev => ({
        ...prev,
        ...(shouldUpdateLocation && {
          location_id: newLocationId,
          location: newLocation
        }),
        ...(shouldUpdateQuantity && {
          quantity: newQuantity
        }),
        status: newStatus
      }));
    }
  }, [allocationData, locationsData, showAllocationOptions, formData.status, formData.quantity]);

  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // We don't need to create a FormData object here
      // The createEquipment service function will handle that
      return createEquipment(data.equipment, data.files);
    },
    onSuccess: (data) => {
      // Invalidate and refetch equipment queries
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-list'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-summary'] });

      setIsSuccess(true);
      setError('');

      // Navigate to the new equipment details page after a short delay
      setTimeout(() => {
        if (data?.equipment?.id) {
          navigate(`/equipment/${data.equipment.id}`);
        } else {
          navigate('/equipment');
        }
      }, 1500);
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      setError(error.response?.data?.message || 'Failed to create equipment');
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
    else if (name === 'location_id' && value) {
      // Find the location name from the selected location_id
      const selectedLocation = locationsData?.locations.find(loc => loc.id.toString() === value);

      if (selectedLocation) {
        console.log('🏪 Selected location:', selectedLocation);

        // Update both location_id and location name
        updatedFormData = {
          ...updatedFormData,
          location_id: value,
          location: selectedLocation.name // Set the location name
        };

        // Check if the location is a storage location (case insensitive)
        const isStorageLocation = selectedLocation.name.toLowerCase().includes('lager') ||
                                selectedLocation.name.toLowerCase().includes('storage') ||
                                selectedLocation.name.toLowerCase().includes('warehouse') ||
                                selectedLocation.name.toLowerCase().includes('depot');

        // Update status based on location and installation type
        if (formData.installation_type === 'fixed' || formData.installation_type === 'semi-permanent') {
          // If equipment is installed, always set status to "in-use"
          updatedFormData.status = 'in-use';
          console.log('🔧 Setting status to "in-use" because equipment is installed');
        } else if (isStorageLocation) {
          // If location is a storage location and equipment is portable, set status to "available"
          updatedFormData.status = 'available';
          console.log('📦 Setting status to "available" because location is storage');
        } else if (updatedFormData.status === 'available') {
          // If location is not storage and status is "available", set status to "in-use"
          updatedFormData.status = 'in-use';
          console.log(`🎯 Setting status to "in-use" because location is not storage (${selectedLocation.name})`);
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

      // Check if the custom location is a storage location (case insensitive)
      const isStorageLocation = value.toLowerCase().includes('lager') ||
                              value.toLowerCase().includes('storage') ||
                              value.toLowerCase().includes('warehouse') ||
                              value.toLowerCase().includes('depot');

      // Update status based on location and installation type
      if (formData.installation_type === 'fixed' || formData.installation_type === 'semi-permanent') {
        // If equipment is installed, always set status to "in-use"
        updatedFormData.status = 'in-use';
        console.log('🔧 Setting status to "in-use" because equipment is installed');
      } else if (isStorageLocation) {
        // If location is a storage location and equipment is portable, set status to "available"
        updatedFormData.status = 'available';
        console.log('📦 Setting status to "available" because custom location is storage');
      } else if (updatedFormData.status === 'available') {
        // If location is not storage and status is "available", set status to "in-use"
        updatedFormData.status = 'in-use';
        console.log(`🎯 Setting status to "in-use" because custom location is not storage (${value})`);
      }
    }
    // Special handling for installation_location_id
    else if (name === 'installation_location_id' && value) {
      // Find the installation location name from the selected installation_location_id
      const selectedInstallationLocation = locationsData?.locations.find(loc => loc.id.toString() === value);

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
    // Special handling for installation_type
    else if (name === 'installation_type') {
      updatedFormData = {
        ...updatedFormData,
        installation_type: value
      };

      // CONDITIONAL RULE: If installation type is fixed or semi-permanent, set status to "in-use"
      if (value === 'fixed' || value === 'semi-permanent') {
        updatedFormData.status = 'in-use';
        console.log(`Setting status to "in-use" because installation type is ${value}`);
      } else if (value === 'portable') {
        // If changing back to portable, reset status based on location
        const locationName = formData.location || '';
        const isLager = locationName.toLowerCase() === 'lager';
        updatedFormData.status = isLager ? 'available' : 'in-use';
        console.log(`Setting status to "${updatedFormData.status}" because installation type is portable`);
      }
    }
    // Special handling for quantity field
    else if (name === 'quantity') {
      const quantityValue = parseInt(value) || 1;
      // Ensure minimum quantity is 1
      updatedFormData.quantity = Math.max(1, quantityValue);
      console.log(`Setting quantity to: ${updatedFormData.quantity}`);
    }
    // Special handling for installation_quantity field
    else if (name === 'installation_quantity') {
      const installationQuantityValue = parseInt(value) || 0;
      // Ensure minimum installation quantity is 0
      updatedFormData.installation_quantity = Math.max(0, installationQuantityValue);
      console.log(`Setting installation quantity to: ${updatedFormData.installation_quantity}`);
    }
    // Special handling for status field
    else if (name === 'status') {
      // If user manually changes status, respect their choice
      console.log(`User manually changed status to: ${value}`);

      // But if location is "Lager", force status to "available"
      const locationName = formData.location || '';
      const isLager = locationName.toLowerCase() === 'lager';

      // But if installation type is fixed/semi-permanent, force status to "in-use"
      if ((formData.installation_type === 'fixed' || formData.installation_type === 'semi-permanent') && value !== 'in-use') {
        console.log('Forcing status back to "in-use" because installation type is fixed/semi-permanent');
        updatedFormData.status = 'in-use';
      } else if (isLager && value !== 'available') {
        console.log('Forcing status back to "available" because location is Lager');
        updatedFormData.status = 'available';
      }
    }

    // Update the form data
    setFormData(updatedFormData);
  };

  // Handle file selection
  const handleFileChange = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  // Handle setting reference image
  const handleSetReferenceImage = (fileId) => {
    // For new equipment, we need to handle temporary file IDs
    // We'll use a special format like "temp-{index}" to identify the file
    setFormData({
      ...formData,
      reference_image_id: fileId.toString(),
    });
  };

  // Handle file deletion for new equipment
  const handleFileDelete = (fileIndex) => {
    // For new equipment, we're just removing from the files array
    const newFiles = [...files];

    // If the deleted file was the reference image, clear the reference_image_id
    if (formData.reference_image_id === fileIndex.toString()) {
      setFormData({
        ...formData,
        reference_image_id: '',
      });
    }

    // Remove the file from the array
    newFiles.splice(fileIndex, 1);
    setFiles(newFiles);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    // Validate required fields
    if (!formData.type_id || !formData.brand || !formData.model) {
      setError('Type, brand, and model are required');
      return;
    }

    // Validate allocation options if allocating
    if (showAllocationOptions && allocationData.allocationType !== 'storage') {
      if (allocationData.allocationType === 'show' && !allocationData.showId) {
        setError('Please select a show for allocation');
        return;
      }
      if (allocationData.allocationType === 'location' && !allocationData.locationId) {
        setError('Please select a location for allocation');
        return;
      }
      if (allocationData.allocationType === 'installation' && !allocationData.installationLocationId && !allocationData.installationLocation) {
        setError('Please select or enter an installation location');
        return;
      }
      if (allocationData.quantity > (formData.quantity || 1)) {
        setError('Allocation quantity cannot exceed total equipment quantity');
        return;
      }
    }

    // Check if there's a reference image file
    const referenceImageFile = formData.reference_image_id === 'new' && files.length > 0
      ? files.find((_, index) => index === 0) // Just use the first file as reference image for simplicity
      : null;

    // Remove the reference image from files if it exists
    const regularFiles = referenceImageFile
      ? files.filter(file => file !== referenceImageFile)
      : files;

    // Prepare equipment data with allocation overrides
    const equipmentData = { ...formData };

    // Override form values with allocation values when allocation is not default storage
    if (showAllocationOptions && allocationData.allocationType !== 'storage') {
      console.log('🔄 ALLOCATION OVERRIDE: Form values will be overridden by allocation settings');
      console.log('📋 Original form data:', {
        location: formData.location,
        location_id: formData.location_id,
        status: formData.status,
        quantity: formData.quantity
      });

      switch (allocationData.allocationType) {
        case 'show':
          // For show allocation, equipment stays in storage but is marked as allocated
          // No location override, but status is set to in-use
          equipmentData.status = 'in-use';
          console.log('📺 Show allocation: status set to in-use');
          break;

        case 'location':
          // Override location with allocation location
          if (allocationData.locationId) {
            const selectedLocation = locationsData?.locations?.find(loc => loc.id.toString() === allocationData.locationId);
            if (selectedLocation) {
              equipmentData.location_id = allocationData.locationId;
              equipmentData.location = selectedLocation.name;
              equipmentData.status = 'in-use';
              console.log('📍 Location allocation override:', selectedLocation.name);
            }
          }
          break;

        case 'installation':
          // Override location with installation location
          if (allocationData.installationLocationId) {
            const selectedLocation = locationsData?.locations?.find(loc => loc.id.toString() === allocationData.installationLocationId);
            if (selectedLocation) {
              equipmentData.location_id = allocationData.installationLocationId;
              equipmentData.location = selectedLocation.name;
              equipmentData.status = 'in-use';
              console.log('🔧 Installation location override:', selectedLocation.name);
            }
          } else if (allocationData.installationLocation) {
            equipmentData.location_id = '';
            equipmentData.location = allocationData.installationLocation;
            equipmentData.status = 'in-use';
            console.log('🔧 Custom installation location override:', allocationData.installationLocation);
          }

          // Add installation-specific fields
          equipmentData.installation_type = allocationData.installationType;
          equipmentData.installation_location = allocationData.installationLocation || '';
          equipmentData.installation_location_id = allocationData.installationLocationId || '';
          equipmentData.installation_quantity = allocationData.quantity || 0;
          equipmentData.installation_date = allocationData.installationDate || '';
          equipmentData.installation_notes = allocationData.installationNotes || '';
          equipmentData.maintenance_schedule = allocationData.maintenanceSchedule || '';
          break;
      }

      console.log('✅ FINAL DATABASE VALUES:', {
        location: equipmentData.location,
        location_id: equipmentData.location_id,
        status: equipmentData.status,
        quantity: equipmentData.quantity,
        allocation_type: allocationData.allocationType
      });
    }

    createMutation.mutate({
      equipment: {
        ...equipmentData,
        // If reference_image_id is 'new', it will be handled by the backend
        reference_image_id: formData.reference_image_id === 'new' ? 'new' : formData.reference_image_id,
      },
      files: regularFiles,
      referenceImageFile: referenceImageFile,
      allocation: showAllocationOptions ? allocationData : null,
    });
  };

  // Cancel creation
  const handleCancel = () => {
    navigate('/equipment');
  };

  // Get allocation summary text for form display
  const getAllocationSummaryText = () => {
    if (!showAllocationOptions || allocationData.allocationType === 'storage') {
      return null;
    }

    switch (allocationData.allocationType) {
      case 'show':
        const showName = allocationData.showId && showsData?.shows?.find(s => s.id.toString() === allocationData.showId)?.name;
        return showName ? `Allocated to show "${showName}"` : 'Allocated to show';

      case 'location':
        const locationName = allocationData.locationId && locationsData?.locations?.find(l => l.id.toString() === allocationData.locationId)?.name;
        return locationName ? `Allocated to ${locationName}` : 'Allocated to location';

      case 'installation':
        const installLocationName = allocationData.installationLocationId && locationsData?.locations?.find(l => l.id.toString() === allocationData.installationLocationId)?.name;
        const customLocation = allocationData.installationLocation;
        const location = installLocationName || customLocation || 'installation location';
        return `Installed at ${location} (${allocationData.installationType})`;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
              <Link to="/equipment" className="hover:text-slate-800 transition-colors">
                Equipment
              </Link>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">Add New Equipment</span>
            </nav>

            {/* Title */}
            <h1 className="text-xl font-bold text-slate-800">Add New Equipment</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllocationOptions(!showAllocationOptions)}
              className="flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showAllocationOptions ? 'Hide' : 'Allocate'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isLoading}
              className="flex items-center min-w-[120px]"
            >
              {createMutation.isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Equipment
                </div>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={createMutation.isLoading}
              className="flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Allocation Options Panel */}
      {showAllocationOptions && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Allocation Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Allocation Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Allocation Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="allocationType"
                    value="storage"
                    checked={allocationData.allocationType === 'storage'}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, allocationType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Default Storage</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="allocationType"
                    value="show"
                    checked={allocationData.allocationType === 'show'}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, allocationType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Allocate to Show</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="allocationType"
                    value="location"
                    checked={allocationData.allocationType === 'location'}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, allocationType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Allocate to Location</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="allocationType"
                    value="installation"
                    checked={allocationData.allocationType === 'installation'}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, allocationType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Install Equipment</span>
                </label>
              </div>
            </div>

            {/* Show Selection (if allocating to show) */}
            {allocationData.allocationType === 'show' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Show</label>
                <select
                  value={allocationData.showId}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, showId: e.target.value }))}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="">Select a show...</option>
                  {showsData?.shows?.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.name}
                      {show.venue && ` - ${show.venue}`}
                      {show.start_date && ` (${new Date(show.start_date).toLocaleDateString()})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Selection (if allocating to location) */}
            {allocationData.allocationType === 'location' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Location</label>
                <select
                  value={allocationData.locationId}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, locationId: e.target.value }))}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="">Select a location...</option>
                  {locationsData?.locations?.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.city && ` (${location.city})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Installation Type (if installing equipment) */}
            {allocationData.allocationType === 'installation' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Installation Type</label>
                <select
                  value={allocationData.installationType}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, installationType: e.target.value }))}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="portable">Portable (can be moved freely)</option>
                  <option value="semi-permanent">Semi-permanent (can be moved with approval)</option>
                  <option value="fixed">Fixed (permanently installed)</option>
                </select>
              </div>
            )}

            {/* Installation Location (if installing equipment) */}
            {allocationData.allocationType === 'installation' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Installation Location</label>
                <select
                  value={allocationData.installationLocationId}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, installationLocationId: e.target.value }))}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="">Select installation location...</option>
                  {locationsData?.locations?.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.city && ` (${location.city})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity (if allocating) */}
            {allocationData.allocationType !== 'storage' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {allocationData.allocationType === 'installation' ? 'Installation Quantity' : 'Allocation Quantity'}
                </label>
                <input
                  type="number"
                  min={allocationData.allocationType === 'installation' ? "0" : "1"}
                  max={formData.quantity || 1}
                  value={allocationData.quantity}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, quantity: parseInt(e.target.value) || (allocationData.allocationType === 'installation' ? 0 : 1) }))}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {allocationData.allocationType === 'installation'
                    ? `Items to install (0-${formData.quantity || 1})`
                    : `Max: ${formData.quantity || 1} (total equipment quantity)`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Additional Installation Fields */}
          {allocationData.allocationType === 'installation' && (
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <div className="p-1 bg-orange-100 rounded mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Installation Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Installation Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Installation Date</label>
                  <input
                    type="date"
                    value={allocationData.installationDate}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, installationDate: e.target.value }))}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>

                {/* Maintenance Schedule */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Maintenance Schedule</label>
                  <select
                    value={allocationData.maintenanceSchedule}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, maintenanceSchedule: e.target.value }))}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  >
                    <option value="">No schedule set</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annually">Semi-annually</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>

                {/* Custom Installation Location */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custom Location (if not in list)</label>
                  <input
                    type="text"
                    value={allocationData.installationLocation}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, installationLocation: e.target.value }))}
                    placeholder="Enter custom installation location"
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              {/* Installation Notes */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Installation Notes</label>
                <textarea
                  value={allocationData.installationNotes}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, installationNotes: e.target.value }))}
                  rows="2"
                  placeholder="Enter installation notes, special requirements, or instructions"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                ></textarea>
              </div>
            </div>
          )}

          {/* Allocation Summary */}
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              {allocationData.allocationType === 'storage' && (
                <span>Equipment will be stored in default storage location</span>
              )}
              {allocationData.allocationType === 'show' && (
                <span>
                  {allocationData.quantity} item(s) will be allocated to show
                  {allocationData.showId && showsData?.shows?.find(s => s.id.toString() === allocationData.showId)?.name &&
                    ` "${showsData.shows.find(s => s.id.toString() === allocationData.showId).name}"`}
                </span>
              )}
              {allocationData.allocationType === 'location' && (
                <span>
                  {allocationData.quantity} item(s) will be allocated to location
                  {allocationData.locationId && locationsData?.locations?.find(l => l.id.toString() === allocationData.locationId)?.name &&
                    ` (${locationsData.locations.find(l => l.id.toString() === allocationData.locationId).name})`}
                </span>
              )}
              {allocationData.allocationType === 'installation' && (
                <span>
                  {allocationData.quantity} item(s) will be installed as {allocationData.installationType}
                  {allocationData.installationLocationId && locationsData?.locations?.find(l => l.id.toString() === allocationData.installationLocationId)?.name &&
                    ` at ${locationsData.locations.find(l => l.id.toString() === allocationData.installationLocationId).name}`}
                  {allocationData.installationLocation && !allocationData.installationLocationId &&
                    ` at ${allocationData.installationLocation}`}
                  {allocationData.installationDate && ` on ${new Date(allocationData.installationDate).toLocaleDateString()}`}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Compact Error/Success Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700 flex-1">{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 ml-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-700">Equipment created successfully! Redirecting...</span>
          </div>
        </div>
      )}

      <EquipmentForm
        formData={formData}
        equipmentTypes={typesData?.types || []}
        categoriesData={categoriesData?.categories || []}
        statusOptions={statusOptions}
        locationsData={locationsData}
        handleInputChange={handleInputChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
        isLoading={createMutation.isLoading}
        error={error}
        files={files}
        uploadProgress={uploadProgress}
        handleSetReferenceImage={handleSetReferenceImage}
        handleFileDelete={handleFileDelete}
        allocationOverride={{
          isLocationOverridden: showAllocationOptions && allocationData.allocationType !== 'storage',
          isStatusOverridden: showAllocationOptions && allocationData.allocationType !== 'storage',
          isQuantityOverridden: showAllocationOptions && allocationData.allocationType !== 'storage',
          allocationSummary: showAllocationOptions ? getAllocationSummaryText() : null
        }}
      />

      {/* Compact Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment Type Management */}
        {user?.role === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-slate-800">Manage Types & Categories</h3>
                <p className="text-xs text-slate-600">Configure equipment types and locations</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs px-2 py-1"
              >
                Settings
              </Button>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-800">Quick Tips</h3>
              <p className="text-xs text-slate-600">Use barcode scanner • Set installation type • Upload reference image</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewEquipmentModern;
