import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import BarcodeScanButton from './BarcodeScanButton';

const EditEquipment = () => {
  const { id } = useParams();
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
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

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

  // Fetch equipment details
  const { data: equipmentData, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const response = await axios.get(`/api/equipment/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      setFormData({
        type: data.type || '',
        brand: data.brand || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        status: data.status || 'available',
        location: data.location || '',
        location_id: data.location_id || '',
        description: data.description || '',
      });
    },
  });

  // Update equipment mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formDataObj = new FormData();

      // Append equipment data
      Object.keys(data.equipment).forEach(key => {
        formDataObj.append(key, data.equipment[key]);
      });

      // Append files to upload
      data.filesToUpload.forEach(file => {
        formDataObj.append('files', file);
      });

      // Append file IDs to delete
      if (data.filesToDelete.length > 0) {
        formDataObj.append('filesToDelete', JSON.stringify(data.filesToDelete));
      }

      return axios.put(`/api/equipment/${id}`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment', id]);
      setFilesToUpload([]);
      setFilesToDelete([]);
      setUploadProgress(0);
      setError('');
      navigate(`/equipment/${id}`);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to update equipment');
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

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Make sure location is properly set
    const updatedFormData = { ...formData };

    // If location_id is set, always fetch the location name from the database
    if (updatedFormData.location_id) {
      const selectedLocation = locationsData?.locations.find(
        loc => loc.id.toString() === updatedFormData.location_id.toString()
      );

      if (selectedLocation) {
        console.log('Found location:', selectedLocation);
        updatedFormData.location = selectedLocation.name;
      }
    } else if (updatedFormData.location_id === '' || updatedFormData.location_id === null) {
      // If location_id is empty but location has a value, keep the custom location
      if (!updatedFormData.location) {
        updatedFormData.location = ''; // Ensure location is empty when location_id is empty
      }
    }

    // Log the data being sent
    console.log('Submitting equipment data:', updatedFormData);

    updateMutation.mutate({
      equipment: updatedFormData,
      filesToUpload,
      filesToDelete,
    });
  };

  // Cancel editing
  const handleCancel = () => {
    navigate(`/equipment/${id}`);
  };

  // File dropzone configuration
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'audio/mpeg': ['.mp3'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 52428800, // 50MB
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setFilesToUpload(prev => [...prev, ...acceptedFiles]);
    },
    onDropRejected: (rejectedFiles) => {
      const errorMessage = rejectedFiles[0]?.errors[0]?.message || 'File upload failed';
      setError(errorMessage);
    },
  });

  // Handle file deletion
  const handleFileDelete = (fileId) => {
    setFilesToDelete(prev => [...prev, fileId]);
  };

  // Remove file from upload list
  const handleRemoveUpload = (index) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return '🖼️';
      case 'audio':
        return '🔊';
      case 'pdf':
        return '📄';
      default:
        return '📎';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {fetchError?.message || 'Failed to load equipment details.'}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Equipment</h1>
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
                <div className="flex" style={{ display: 'flex', width: '100%' }}>
                  <input
                    type="text"
                    id="serial_number"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    style={{ width: 'calc(100% - 120px)' }}
                    className="rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const barcodeButton = document.getElementById('barcode-scan-button-serial-edit');
                      if (barcodeButton) barcodeButton.click();
                    }}
                    style={{
                      width: '120px',
                      backgroundColor: '#4F46E5',
                      color: 'white',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTopRightRadius: '0.375rem',
                      borderBottomRightRadius: '0.375rem',
                      borderLeft: 'none'
                    }}
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
                      id="barcode-scan-button-serial-edit"
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
                  required
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

            {/* Files Section */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Files</h2>

              {/* Existing Files */}
              {equipmentData.files && equipmentData.files.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {equipmentData.files
                    .filter(file => !filesToDelete.includes(file.id))
                    .map((file) => (
                      <div key={file.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getFileIcon(file.file_type)}</span>
                          <div>
                            <p className="font-medium">{file.file_name}</p>
                            <p className="text-sm text-gray-500">{file.file_type}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={`/api/files/${file.id}?download=true`}
                            download
                            className="text-indigo-600 hover:text-indigo-900"
                            aria-label={`Download ${file.file_name}`}
                          >
                            📥
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFileDelete(file.id)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete ${file.file_name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">No files attached.</p>
              )}

              {/* File Upload Dropzone */}
              <div className="mt-4">
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <input {...getInputProps()} />
                  <p className="text-gray-500">
                    Drag & drop files here, or click to select files
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supported formats: JPEG, PNG, MP3, PDF (Max: 5 files, 50MB each)
                  </p>
                </div>

                {/* Files to upload preview */}
                {filesToUpload.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Files to upload:</h3>
                    <ul className="space-y-2">
                      {filesToUpload.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUpload(index)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Remove ${file.name}`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload progress */}
                {updateMutation.isLoading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Type Management Notice */}
            {user?.role === 'admin' && (
              <div className="border-t border-gray-200 mt-8 pt-6">
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

            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 text-right mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updateMutation.isLoading}
              >
                {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEquipment;
