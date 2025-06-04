import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import EquipmentLogList from './EquipmentLogList';

const EquipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if edit mode is enabled from URL path
  const [isEditing, setIsEditing] = useState(false);
  // State for active tab - default to 'details'
  const [activeTab, setActiveTab] = useState('details');

  // Update editing state when URL changes
  useEffect(() => {
    // We're not in edit mode in the EquipmentDetails component anymore
    // Edit mode is now handled by the EditEquipment component
    setIsEditing(false);
  }, [location.pathname]);
  const [formData, setFormData] = useState({
    type: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
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
      console.log(`Fetching equipment with ID: ${id}`);
      const response = await axios.get(`/api/equipment/${id}`);
      console.log('Equipment API response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      setFormData({
        type: data.type || '',
        category: data.category || '',
        brand: data.brand || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        status: data.status || 'available',
        location: data.location || '',
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
      setIsEditing(false);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      equipment: formData,
      filesToUpload,
      filesToDelete,
    });
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      type: equipmentData.type || '',
      category: equipmentData.category || '',
      brand: equipmentData.brand || '',
      model: equipmentData.model || '',
      serial_number: equipmentData.serial_number || '',
      status: equipmentData.status || 'available',
      location: equipmentData.location || '',
      description: equipmentData.description || '',
    });
    setFilesToUpload([]);
    setFilesToDelete([]);
    setError('');
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
    disabled: !isEditing,
  });

  // Handle file deletion
  const handleFileDelete = (fileId) => {
    setFilesToDelete(prev => [...prev, fileId]);
  };

  // Remove file from upload list
  const handleRemoveUpload = (index) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Determine if user can edit
  const canEdit = user?.role === 'admin' || user?.role === 'advanced';

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
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Edit Equipment' : 'Equipment Details'}
        </h1>
        <div>
          {!isEditing && canEdit && (
            <Link
              to={`/equipment/${id}/edit`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 inline-block"
              aria-label="Edit equipment"
            >
              Edit
            </Link>
          )}
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
          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'details'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'documents'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documents & Attachments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'history'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Movement History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Type */}
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    {isEditing ? (
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
                    ) : (
                      <p className="text-gray-900">{equipmentData.type}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="category"
                        name="category"
                        value={formData.category || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-900">{equipmentData.category || 'Not specified'}</p>
                    )}
                  </div>

                  {/* Brand */}
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                      Brand
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="brand"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{equipmentData.brand}</p>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="model"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{equipmentData.model}</p>
                    )}
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="serial_number"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{equipmentData.serial_number}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    {isEditing ? (
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${equipmentData.status === 'available' ? 'bg-green-100 text-green-800' :
                            equipmentData.status === 'in-use' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                          {equipmentData.status}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {(() => {
                          console.log('Equipment Data in render:', equipmentData);

                          // First check if locationDetails is available from the server
                          if (equipmentData.locationDetails && equipmentData.locationDetails.name) {
                            console.log('Using locationDetails.name:', equipmentData.locationDetails.name);

                            // Format location with address details if available
                            let locationDisplay = equipmentData.locationDetails.name;
                            const addressParts = [];

                            if (equipmentData.locationDetails.city)
                              addressParts.push(equipmentData.locationDetails.city);
                            if (equipmentData.locationDetails.region)
                              addressParts.push(equipmentData.locationDetails.region);
                            if (equipmentData.locationDetails.country)
                              addressParts.push(equipmentData.locationDetails.country);

                            if (addressParts.length > 0) {
                              locationDisplay += ` (${addressParts.join(', ')})`;
                            }

                            return locationDisplay;
                          }

                          // If we have location_id and locations data, try to find the location name
                          if (equipmentData.location_id && locationsData?.locations) {
                            console.log('Trying to find location with ID:', equipmentData.location_id);

                            // Convert location_id to number for comparison if it's a string
                            const locationId = typeof equipmentData.location_id === 'string'
                              ? parseInt(equipmentData.location_id, 10)
                              : equipmentData.location_id;

                            const locationRecord = locationsData.locations.find(
                              loc => loc.id === locationId
                            );

                            console.log('Found location record:', locationRecord);

                            if (locationRecord) {
                              // Format location with address details if available
                              let locationDisplay = locationRecord.name;
                              const addressParts = [];

                              if (locationRecord.city) addressParts.push(locationRecord.city);
                              if (locationRecord.region) addressParts.push(locationRecord.region);
                              if (locationRecord.country) addressParts.push(locationRecord.country);

                              if (addressParts.length > 0) {
                                locationDisplay += ` (${addressParts.join(', ')})`;
                              }

                              return locationDisplay;
                            }
                          }

                          // If location is directly available as a fallback, use it
                          if (equipmentData.location) {
                            console.log('Using location field as fallback:', equipmentData.location);
                            return equipmentData.location;
                          }

                          // If nothing is available
                          console.log('No location information found');
                          return 'Not Specified';
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-line">{equipmentData.description || 'No description provided.'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Documents & Attachments Tab */}
            {activeTab === 'documents' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Documents & Attachments</h2>

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
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleFileDelete(file.id)}
                                className="text-red-600 hover:text-red-900"
                                aria-label={`Delete ${file.file_name}`}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-6">No files attached.</p>
                )}

                {/* File Upload Dropzone (only in edit mode) */}
                {isEditing && (
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
                )}
              </div>
            )}

            {/* Movement History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Movement History</h2>
                <EquipmentLogList equipmentId={id} />
              </div>
            )}
          </div>

          {/* Equipment Type Management Notice */}
          {isEditing && user?.role === 'admin' && (
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
          {isEditing && (
            <div className="px-6 py-4 bg-gray-50 text-right">
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
          )}
        </form>
      </div>
    </div>
  );
};

export default EquipmentDetails;
