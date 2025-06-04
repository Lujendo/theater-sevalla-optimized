import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { useAuth } from '../context/AuthContext';
import FileUpload from './FileUpload';
import BarcodeScanButton from './BarcodeScanButton';
import EquipmentLookup from './EquipmentLookup';
import BarcodeCardCreator from './BarcodeCardCreator';

const NewEquipment = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    type: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
    location_id: '',
    description: '',
  });

  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch equipment types for dropdown
  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: getEquipmentTypes
  });

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000, // 5 minutes
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance'];

  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create a new object with the equipment data and files
      const equipmentData = {
        ...data.equipment,
        files: data.files
      };

      return createEquipment(equipmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate('/equipment');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to create equipment');
    },
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for location_id
    if (name === 'location_id') {
      if (value) {
        // Find the location name from the selected location_id
        const selectedLocation = locationsData?.locations.find(loc => loc.id.toString() === value);

        if (selectedLocation) {
          console.log('Selected location:', selectedLocation);

          // Check if location is Lager and update status accordingly
          const isLager = selectedLocation.name.toLowerCase() === 'lager';

          // If location is Lager, set status to available
          // If location is not Lager, set status to in-use
          // Unless status is something other than available/in-use (like maintenance or broken)
          let newStatus = formData.status;

          if (isLager && formData.status === 'in-use') {
            newStatus = 'available';
            console.log(`Location is Lager, setting status to available`);
          } else if (!isLager && formData.status === 'available') {
            newStatus = 'in-use';
            console.log(`Location is not Lager (${selectedLocation.name}), setting status to in-use`);
          }

          // Update location_id but don't set location name - it will be fetched from DB
          setFormData(prev => ({
            ...prev,
            [name]: value,
            location: '', // Clear location field when using location_id
            status: newStatus // Update status based on location
          }));
          return;
        }
      } else {
        // If location_id is cleared, also clear location
        setFormData(prev => ({
          ...prev,
          location_id: '',
          location: ''
        }));
        return;
      }
    }

    // Special handling for location field - clear location_id if location is manually entered
    if (name === 'location') {
      // Check if custom location is Lager and update status accordingly
      const isLager = value.toLowerCase() === 'lager';

      // If location is Lager, set status to available
      // If location is not Lager, set status to in-use
      // Unless status is something other than available/in-use (like maintenance or broken)
      let newStatus = formData.status;

      if (isLager && value !== '' && formData.status === 'in-use') {
        newStatus = 'available';
        console.log(`Custom location is Lager, setting status to available`);
      } else if (!isLager && value !== '' && formData.status === 'available') {
        newStatus = 'in-use';
        console.log(`Custom location is not Lager (${value}), setting status to in-use`);
      }

      setFormData(prev => ({
        ...prev,
        [name]: value,
        location_id: '', // Always clear location_id when custom location is entered
        status: newStatus // Update status based on location
      }));
      return;
    }

    // For all other fields, just update normally
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file selection
  const handleFileChange = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.type || !formData.brand || !formData.model || !formData.serial_number) {
      setError('Type, brand, model, and serial number are required');
      return;
    }

    createMutation.mutate({
      equipment: formData,
      files,
    });
  };

  // Cancel creation
  const handleCancel = () => {
    navigate('/equipment');
  };

  // Handle equipment found from lookup
  const handleEquipmentFound = (equipment) => {
    // Show a confirmation dialog
    if (window.confirm(`Equipment with serial number ${equipment.serial_number} found. Would you like to duplicate it?`)) {
      // Pre-fill the form with the found equipment data
      setFormData({
        type: equipment.type || '',
        brand: equipment.brand || '',
        model: equipment.model || '',
        serial_number: '', // Clear the serial number as it must be unique
        status: equipment.status || 'available',
        location: equipment.location || '',
        location_id: equipment.location_id || '',
        description: equipment.description || '',
      });
    }
  };

  // Handle equipment created from barcode scan
  const handleEquipmentCreated = (equipment) => {
    // Show a success message
    alert(`Equipment with serial number ${equipment.serial_number} created successfully!`);
    // Navigate to the edit page for the newly created equipment
    navigate(`/equipment/${equipment.id}/edit`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Add New Equipment</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <EquipmentLookup onEquipmentFound={handleEquipmentFound} />
        </div>
        <div>
          <BarcodeCardCreator onEquipmentCreated={handleEquipmentCreated} />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Type</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name.toLowerCase()}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Model */}
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Serial Number */}
              <div>
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <div className="barcode-input-container">
                  <input
                    type="text"
                    id="serial_number"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    className="barcode-input rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const barcodeButton = document.getElementById('barcode-scan-button-serial');
                      if (barcodeButton) barcodeButton.click();
                    }}
                    className="barcode-scan-button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                    Scan
                  </button>
                  <div style={{ display: 'none' }}>
                    <BarcodeScanButton
                      id="barcode-scan-button-serial"
                      onScan={(scannedValue) => {
                        setFormData(prev => ({ ...prev, serial_number: scannedValue }));
                      }}
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Click the Scan button to scan a barcode for the serial number
                </p>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    formData.status === 'available' ?
                      'bg-green-50 border-green-300 text-green-700 font-medium' :
                    formData.status === 'in-use' ?
                      'bg-yellow-50 border-yellow-300 text-yellow-700 font-medium' :
                    formData.status === 'maintenance' ?
                      'bg-orange-50 border-orange-300 text-orange-700 font-medium' :
                    formData.status === 'broken' ?
                      'bg-red-50 border-red-300 text-red-700 font-medium' :
                      'border-gray-300'
                  }`}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Status info message */}
                {formData.location_id || formData.location ?
                  (formData.location_id ?
                    (locationsData?.locations.find(loc => loc.id.toString() === formData.location_id.toString())?.name.toLowerCase() !== 'lager') :
                    (formData.location.toLowerCase() !== 'lager')) ?
                    <p className="mt-1 text-sm text-yellow-600">
                      <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Status automatically set to "In-use" for non-Lager locations
                    </p> :
                    <p className="mt-1 text-sm text-green-600">
                      <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Status automatically set to "Available" for Lager location
                    </p>
                  : null
                }
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location_id"
                  name="location_id"
                  value={formData.location_id || ''}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mb-2"
                >
                  <option value="">Select Location</option>
                  {(locationsData?.locations || []).map((location) => {
                    // Create a more detailed label with address information if available
                    let label = location.name;
                    const addressParts = [];

                    if (location.city) addressParts.push(location.city);
                    if (location.region) addressParts.push(location.region);
                    if (location.country) addressParts.push(location.country);

                    if (addressParts.length > 0) {
                      label += ` (${addressParts.join(', ')})`;
                    }

                    return (
                      <option key={location.id} value={location.id.toString()}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Location (if not in list)
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter custom location"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* File Upload */}
            <div className="mt-6">
              <FileUpload onFileChange={handleFileChange} />
            </div>

            {/* Equipment Type Management Notice */}
            {user?.role === 'admin' && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        You can manage equipment types in the <Link to="/settings" className="font-medium underline">Settings</Link> page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit and Cancel Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={createMutation.isLoading}
              >
                {createMutation.isLoading ? 'Creating...' : 'Create Equipment'}
              </button>
            </div>

            {/* Upload Progress */}
            {createMutation.isLoading && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEquipment;
