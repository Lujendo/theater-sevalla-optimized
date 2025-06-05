import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, updateEquipment, deleteEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Input, Select } from './ui';
import ConfirmationDialogModern from './ConfirmationDialogModern';
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

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [layout, setLayout] = useState('grid');
  const [isEditing, setIsEditing] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    type_id: '',
    category_id: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
    description: '',
    reference_image_id: '',
  });

  const [error, setError] = useState('');

  // Fetch equipment types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ['equipmentTypes'],
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
  const { data: equipment, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
    onSuccess: (data) => {
      console.log('Equipment data loaded:', data);
      setFormData({
        type_id: data.type_id ? data.type_id.toString() : '',
        category_id: data.category_id ? data.category_id.toString() : '',
        category: data.category || '',
        brand: data.brand || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        status: data.status || 'available',
        location: data.location || '',
        description: data.description || '',
        reference_image_id: data.reference_image_id ? data.reference_image_id.toString() : '',
      });
    },
  });

  // Update equipment mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const cleanEquipmentData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
      );
      return updateEquipment(id, cleanEquipmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      setIsEditing(false);
      toast.success('Equipment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      setError(error.response?.data?.message || 'Failed to update equipment');
      toast.error('Failed to update equipment');
    },
  });

  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate('/equipment');
      toast.success('Equipment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete equipment');
    },
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Handle save button click
  const handleSave = () => {
    // Validate required fields
    if (!formData.brand || !formData.model || !formData.serial_number) {
      setError('Brand, model, and serial number are required');
      return;
    }

    updateMutation.mutate(formData);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form data to original equipment data
    if (equipment) {
      setFormData({
        type_id: equipment.type_id ? equipment.type_id.toString() : '',
        category_id: equipment.category_id ? equipment.category_id.toString() : '',
        category: equipment.category || '',
        brand: equipment.brand || '',
        model: equipment.model || '',
        serial_number: equipment.serial_number || '',
        status: equipment.status || 'available',
        location: equipment.location || '',
        description: equipment.description || '',
        reference_image_id: equipment.reference_image_id ? equipment.reference_image_id.toString() : '',
      });
    }
    setIsEditing(false);
    setError('');
  };

  // Handle file upload success
  const handleFileUploadSuccess = (files) => {
    queryClient.invalidateQueries(['equipment', id]);
    toast.success(`Successfully uploaded ${files.length} file(s)`);
  };

  // Handle delete button click
  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirmation(false);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  // Handle back button click
  const handleBack = () => {
    navigate('/equipment');
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
      default:
        return 'secondary';
    }
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
                  onClick={handleBack}
                >
                  Back to Equipment List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug: Log equipment data
  console.log('[EDIT EQUIPMENT] Equipment data:', equipment);
  console.log('[EDIT EQUIPMENT] reference_image_id:', equipment?.reference_image_id);
  console.log('[EDIT EQUIPMENT] files:', equipment?.files);

  // Convert reference_image_id to number for proper comparison
  const refImageId = equipment?.reference_image_id ? parseInt(equipment.reference_image_id) : null;

  // Check if reference image exists in files
  const referenceImage = equipment?.files?.find(file => file.id === refImageId);

  return (
    <div className="space-y-6">
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
              {equipment?.brand} {equipment?.model} • {equipment?.serial_number}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Details
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={updateMutation.isLoading}
                className="flex items-center"
              >
                {updateMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-1"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleEdit}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Equipment
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid layout for main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left column - Equipment Information Tabs */}
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
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    {/* Main Information */}
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
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Category</h3>
                              {isEditing ? (
                                <Select
                                  name="category_id"
                                  value={formData.category_id}
                                  onChange={handleInputChange}
                                  options={[
                                    { value: '', label: 'Select Category' },
                                    ...(categoriesData?.categories || []).map(category => ({
                                      value: category.id.toString(),
                                      label: category.name
                                    }))
                                  ]}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.category || 'Not specified'}</p>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Type</h3>
                              {isEditing ? (
                                <Select
                                  name="type_id"
                                  value={formData.type_id}
                                  onChange={handleInputChange}
                                  options={[
                                    { value: '', label: 'Select Type' },
                                    ...(typesData?.types || []).map(type => ({
                                      value: type.id.toString(),
                                      label: type.name
                                    }))
                                  ]}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.type}</p>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Brand</h3>
                              {isEditing ? (
                                <Input
                                  name="brand"
                                  value={formData.brand}
                                  onChange={handleInputChange}
                                  className="mt-1"
                                  required
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.brand}</p>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Model</h3>
                              {isEditing ? (
                                <Input
                                  name="model"
                                  value={formData.model}
                                  onChange={handleInputChange}
                                  className="mt-1"
                                  required
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.model}</p>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Serial Number</h3>
                              {isEditing ? (
                                <Input
                                  name="serial_number"
                                  value={formData.serial_number}
                                  onChange={handleInputChange}
                                  className="mt-1"
                                  required
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.serial_number}</p>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Status</h3>
                              {isEditing ? (
                                <Select
                                  name="status"
                                  value={formData.status}
                                  onChange={handleInputChange}
                                  options={statusOptions.map(status => ({
                                    value: status,
                                    label: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
                                  }))}
                                  className="mt-1"
                                />
                              ) : (
                                <div className="mt-1">
                                  {equipment?.status && (
                                    <Badge variant={getStatusVariant(equipment.status)} size="md">
                                      {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Location</h3>
                              {isEditing ? (
                                <Input
                                  name="location"
                                  value={formData.location}
                                  onChange={handleInputChange}
                                  className="mt-1"
                                  placeholder="Enter location"
                                />
                              ) : (
                                <p className="mt-1 text-base font-medium text-slate-900">{equipment?.location || 'Not specified'}</p>
                              )}
                            </div>
                          </div>

                          <div className="mt-8 border-t border-slate-200 pt-6">
                            <div className="flex items-center mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                              <h3 className="text-sm font-medium text-slate-700">Description</h3>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                              {isEditing ? (
                                <textarea
                                  name="description"
                                  value={formData.description}
                                  onChange={handleInputChange}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                                  placeholder="Enter equipment description..."
                                />
                              ) : (
                                <p className="text-base text-slate-800 whitespace-pre-line">{equipment?.description || 'No description provided'}</p>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents & Attachments Tab */}
              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Documents & Attachments</h2>
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <Button
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
                    )}
                  </div>

                  {equipment?.files && equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length}
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length === 1 ? ' file' : ' files'} attached
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
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
                        files={equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id)}
                        layout={layout}
                        size="medium"
                        showDownload={true}
                        canDelete={user?.role === 'admin' || user?.role === 'advanced'}
                        onDelete={(fileId) => {
                          // Handle file deletion
                          queryClient.invalidateQueries(['equipment', id]);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium mb-2">No documents attached to this equipment</p>
                      {(user?.role === 'admin' || user?.role === 'advanced') && (
                        <div className="mt-4">
                          <Button
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Movement History Tab */}
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

        {/* Right column - Reference Image */}
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
                      alt={`${equipment?.brand} ${equipment?.model}`}
                      className="w-full h-auto object-contain rounded-md"
                      onError={(e) => {
                        console.error('Error loading thumbnail, falling back to original image');
                        e.target.src = getFileUrl(referenceImage.id);
                        e.target.onerror = null;
                      }}
                    />
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <button
                        onClick={() => setShowReferenceImageModal(true)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                        title="Change reference image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">{referenceImage.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {referenceImage.file_size ? `${(referenceImage.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No reference image</p>
                  <p className="text-sm text-gray-500 mb-4">Add a reference image to help identify this equipment</p>
                  {(user?.role === 'admin' || user?.role === 'advanced') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center mx-auto"
                      onClick={() => setShowReferenceImageModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Set Reference Image
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeleteConfirmation && (
        <ConfirmationDialogModern
          isOpen={showDeleteConfirmation}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Equipment"
          message={`Are you sure you want to delete "${equipment?.brand} ${equipment?.model}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {showReferenceImageModal && (
        <ReferenceImageModal
          isOpen={showReferenceImageModal}
          onClose={() => setShowReferenceImageModal(false)}
          equipmentId={id}
          currentReferenceImageId={equipment?.reference_image_id}
          files={equipment?.files || []}
          onSuccess={() => {
            queryClient.invalidateQueries(['equipment', id]);
            setShowReferenceImageModal(false);
          }}
        />
      )}

      {showFileUploadModal && (
        <FileUploadModal
          isOpen={showFileUploadModal}
          onClose={() => setShowFileUploadModal(false)}
          equipmentId={id}
          onSuccess={handleFileUploadSuccess}
        />
      )}
    </div>
  );
};

export default EditEquipmentModern;
