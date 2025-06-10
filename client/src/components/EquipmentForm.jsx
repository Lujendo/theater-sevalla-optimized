import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { Input, BarcodeInput, Select } from './ui';
import FileUpload from './FileUpload';
import ReferenceImageUpload from './ReferenceImageUpload';
import { getLocations } from '../services/locationService';

const EquipmentForm = ({
  formData,
  equipmentTypes,
  categoriesData,
  statusOptions,
  handleInputChange,
  handleFileChange,
  handleSubmit,
  handleCancel,
  isLoading,
  error,
  isEditing = false,
  files = [],
  uploadProgress = 0,
  existingFiles = [],
  handleFileDelete,
  handleSetReferenceImage,
  allocationOverride = null,
}) => {
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageFile, setReferenceImageFile] = useState(null);

  // Fetch locations
  const { data: locationsData } = useQuery(['locations'], getLocations, {
    staleTime: 300000, // 5 minutes
  });

  // We're now receiving categoriesData as a prop, so we don't need to fetch it here

  // Find the reference image from existing files
  useEffect(() => {
    if (existingFiles && existingFiles.length > 0 && formData.reference_image_id) {
      // Try to find in existing files
      const refImage = existingFiles.find(file => file.id.toString() === formData.reference_image_id);
      if (refImage) {
        setReferenceImage(refImage);
        return;
      }
    }

    // If no reference image found
    setReferenceImage(null);
  }, [existingFiles, formData.reference_image_id]);

  // Handle reference image selection
  const handleReferenceImageSelect = (file) => {
    setReferenceImageFile(file);

    if (file) {
      // Set a temporary ID for the reference image
      handleInputChange({ target: { name: 'reference_image_id', value: 'new' } });
    } else {
      // Clear the reference image ID
      handleInputChange({ target: { name: 'reference_image_id', value: '' } });
    }
  };

  // Handle reference image deletion
  const handleReferenceImageDelete = (fileId) => {
    setReferenceImage(null);
    handleInputChange({ target: { name: 'reference_image_id', value: '' } });

    // If handleFileDelete is provided, call it with the fileId
    if (handleFileDelete) {
      handleFileDelete(fileId);
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <form onSubmit={handleSubmit}>
        {/* Compact Form Header */}
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Equipment Information</h2>
        </div>

        {/* Form Body */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <Select
              id="category_id"
              name="category_id"
              label="Category"
              value={formData.category_id || ''}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Category' },
                ...(categoriesData || []).map((category) => ({
                  value: category.id.toString(),
                  label: category.name,
                }))
              ]}
            />

            {/* Type */}
            <Select
              id="type_id"
              name="type_id"
              label="Type"
              value={formData.type_id || ''}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Type' },
                ...equipmentTypes.map((type) => ({
                  value: type.id.toString(),
                  label: type.name,
                }))
              ]}
              required
            />

            {/* Brand */}
            <Input
              id="brand"
              name="brand"
              label="Brand"
              value={formData.brand}
              onChange={handleInputChange}
              placeholder="Enter brand"
              required
            />

            {/* Model */}
            <Input
              id="model"
              name="model"
              label="Model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="Enter model"
              required
            />

            {/* Serial Number */}
            <BarcodeInput
              id="serial_number"
              name="serial_number"
              label="Serial Number"
              value={formData.serial_number}
              onChange={handleInputChange}
              placeholder="Enter serial number (optional)"
              onScan={(scannedValue) => {
                handleInputChange({ target: { name: 'serial_number', value: scannedValue } });
              }}
            />

            {/* Location */}
            <div className="space-y-4">
              <div className="relative">
                <Select
                  id="location_id"
                  name="location_id"
                  label="Location"
                  value={formData.location_id ? formData.location_id.toString() : ''}
                  onChange={handleInputChange}
                  options={[
                    { value: '', label: 'Select Location' },
                    ...(locationsData?.locations || []).map((location) => {
                      // Create a more detailed label with address information if available
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
                  disabled={allocationOverride?.isLocationOverridden}
                  className={allocationOverride?.isLocationOverridden ? 'opacity-50 cursor-not-allowed' : ''}
                />
                {allocationOverride?.isLocationOverridden && (
                  <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    <div className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Location will be overridden by allocation settings
                    </div>
                  </div>
                )}
              </div>
              <Input
                id="location"
                name="location"
                label="Custom Location (if not in list)"
                value={formData.location || ''}
                onChange={handleInputChange}
                placeholder="Enter custom location"
                disabled={allocationOverride?.isLocationOverridden}
                className={allocationOverride?.isLocationOverridden ? 'opacity-50 cursor-not-allowed' : ''}
              />
            </div>

            {/* Status */}
            <div className="relative">
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
                disabled={allocationOverride?.isStatusOverridden}
                className={allocationOverride?.isStatusOverridden ? 'opacity-50 cursor-not-allowed' : ''}
              />
              {allocationOverride?.isStatusOverridden && (
                <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Status will be set automatically based on allocation
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="relative">
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
                disabled={allocationOverride?.isQuantityOverridden}
                className={allocationOverride?.isQuantityOverridden ? 'opacity-50 cursor-not-allowed' : ''}
              />
              {allocationOverride?.isQuantityOverridden && (
                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Quantity allocation will be managed by allocation settings
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Description */}
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter description"
            ></textarea>
          </div>

          {/* Reference Image */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <h3 className="text-base font-semibold text-slate-800 mb-2 flex items-center">
              <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Reference Image
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Upload a <strong>single reference image</strong> that best represents this equipment.
            </p>
            <ReferenceImageUpload
              onImageSelect={handleReferenceImageSelect}
              existingImage={referenceImage}
              onImageDelete={handleReferenceImageDelete}
            />
          </div>

          {/* File Upload */}
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg">
            <h3 className="text-base font-semibold text-slate-800 mb-2 flex items-center">
              <div className="p-1.5 bg-slate-100 rounded-lg mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Documents & Attachments
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Upload additional documents and images (manuals, invoices, photos, etc.).
            </p>
            <FileUpload
              onFileSelect={handleFileChange}
              uploadProgress={uploadProgress}
              existingFiles={existingFiles}
              onFileDelete={handleFileDelete}
              multiple
              maxFiles={5}
            />
          </div>
        </div>

        {/* Compact Form Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-center">
            <div className="text-xs text-slate-600">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Required fields marked with * • Use Create Equipment button above to save
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

EquipmentForm.propTypes = {
  formData: PropTypes.object.isRequired,
  equipmentTypes: PropTypes.array.isRequired,
  categoriesData: PropTypes.array,
  statusOptions: PropTypes.array.isRequired,
  locationsData: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
  handleFileChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  isEditing: PropTypes.bool,
  files: PropTypes.array,
  uploadProgress: PropTypes.number,
  existingFiles: PropTypes.array,
  handleFileDelete: PropTypes.func,
  handleSetReferenceImage: PropTypes.func,
  allocationOverride: PropTypes.object,
};

export default EquipmentForm;
