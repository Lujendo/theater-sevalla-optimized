import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { returnFromInstallation } from '../services/equipmentService';

const InstallationManagementModal = ({ equipment, locations, onClose, isOpen }) => {
  const [formData, setFormData] = useState({
    installation_type: 'portable',
    installation_location_id: '',
    installation_location: '',
    installation_date: '',
    installation_notes: '',
    installation_quantity: 1
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReturnQuantityModal, setShowReturnQuantityModal] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const queryClient = useQueryClient();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && equipment) {
      setFormData({
        installation_type: equipment.installation_type || 'portable',
        installation_location_id: equipment.installation_location_id || '',
        installation_location: equipment.installation_location || '',
        installation_date: equipment.installation_date ? equipment.installation_date.split('T')[0] : '',
        installation_notes: equipment.installation_notes || '',
        installation_quantity: equipment.installation_quantity || 1
      });
      // Set return quantity to current installation quantity
      setReturnQuantity(equipment.installation_quantity || 1);
    }
  }, [isOpen, equipment]);

  // Update installation mutation
  const updateInstallationMutation = useMutation({
    mutationFn: async (installationData) => {
      const response = await axios.put(`/api/equipment/${equipment.id}/installation`, installationData);
      return response.data;
    },
    onSuccess: () => {
      // Force refetch of all equipment-related queries to ensure UI updates
      queryClient.refetchQueries(['equipment', equipment.id]);
      queryClient.refetchQueries(['equipmentAvailability', equipment.id]);
      queryClient.refetchQueries(['equipmentShowAllocations', equipment.id]);
      queryClient.refetchQueries(['inventoryAllocations', equipment.id]);

      // Invalidate broader queries
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['show-equipment']);
      queryClient.invalidateQueries(['equipment-availability']);
      queryClient.invalidateQueries(['storageAvailability']);

      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to update installation details');
    }
  });

  // Return from installation mutation (using DELETE endpoint)
  const returnFromInstallationMutation = useMutation({
    mutationFn: async (quantity) => {
      return await returnFromInstallation(equipment.id, quantity);
    },
    onSuccess: (data) => {
      // Force refetch of all equipment-related queries to ensure UI updates
      queryClient.refetchQueries(['equipment', equipment.id]);
      queryClient.refetchQueries(['equipmentAvailability', equipment.id]);
      queryClient.refetchQueries(['equipmentShowAllocations', equipment.id]);
      queryClient.refetchQueries(['inventoryAllocations', equipment.id]);

      // Invalidate broader queries
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['show-equipment']);
      queryClient.invalidateQueries(['equipment-availability']);
      queryClient.invalidateQueries(['storageAvailability']);

      setShowReturnQuantityModal(false);
      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to return equipment from installation');
    }
  });

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate form data
    if (formData.installation_type !== 'portable') {
      if (!formData.installation_location_id && !formData.installation_location) {
        setError('Installation location is required for fixed/semi-permanent equipment');
        return;
      }
      if (formData.installation_quantity > (equipment.quantity || 1)) {
        setError(`Installation quantity cannot exceed total equipment quantity (${equipment.quantity || 1})`);
        return;
      }
    }

    updateInstallationMutation.mutate(formData);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear location fields when switching to portable
    if (field === 'installation_type' && value === 'portable') {
      setFormData(prev => ({
        ...prev,
        installation_location_id: '',
        installation_location: '',
        installation_date: '',
        installation_notes: '',
        installation_quantity: 1
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Installation Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                {equipment?.brand} {equipment?.model}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Installation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Installation Type
              </label>
              <select
                value={formData.installation_type}
                onChange={(e) => handleInputChange('installation_type', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="portable">Portable Equipment</option>
                <option value="semi-permanent">Semi-Permanent Installation</option>
                <option value="fixed">Fixed Installation</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.installation_type === 'portable' && 'Equipment can be freely moved and allocated to shows'}
                {formData.installation_type === 'semi-permanent' && 'Equipment is installed but can be moved with approval'}
                {formData.installation_type === 'fixed' && 'Equipment is permanently installed and cannot be moved'}
              </p>
            </div>

            {/* Installation Location (only for non-portable) */}
            {formData.installation_type !== 'portable' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Installation Location
                  </label>
                  <div className="space-y-3">
                    {/* Location Dropdown */}
                    <select
                      value={formData.installation_location_id}
                      onChange={(e) => handleInputChange('installation_location_id', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select from existing locations</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Custom Location Input */}
                    <div className="text-center text-sm text-gray-500">or</div>
                    <input
                      type="text"
                      value={formData.installation_location}
                      onChange={(e) => handleInputChange('installation_location', e.target.value)}
                      placeholder="Enter custom installation location"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose an existing location or enter a custom installation location
                  </p>
                </div>

                {/* Installation Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Installation Date
                  </label>
                  <input
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => handleInputChange('installation_date', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Installation Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Installation Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={equipment?.quantity || 1}
                    value={formData.installation_quantity}
                    onChange={(e) => handleInputChange('installation_quantity', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of items to install (max: {equipment?.quantity || 1})
                  </p>
                </div>

                {/* Installation Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Installation Notes
                  </label>
                  <textarea
                    value={formData.installation_notes}
                    onChange={(e) => handleInputChange('installation_notes', e.target.value)}
                    rows={3}
                    placeholder="Add notes about the installation..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              {/* Return from Installation Button (only show if currently installed) */}
              {equipment?.installation_type !== 'portable' && (
                <button
                  type="button"
                  onClick={() => setShowReturnQuantityModal(true)}
                  disabled={returnFromInstallationMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Return from Installation
                </button>
              )}

              <div className="flex space-x-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateInstallationMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateInstallationMutation.isLoading ? 'Saving...' : 'Save Installation Details'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Return Quantity Selection Modal */}
      {showReturnQuantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Return from Installation</h3>
              <p className="text-sm text-gray-600 mt-1">
                Select quantity to return from installation
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Return
                </label>
                <input
                  type="number"
                  min="1"
                  max={equipment?.installation_quantity || 1}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Currently installed: {equipment?.installation_quantity || 0} items
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnQuantityModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Return ${returnQuantity} item${returnQuantity !== 1 ? 's' : ''} from installation back to ${returnQuantity === (equipment?.installation_quantity || 0) ? 'portable status' : 'reduce installation quantity'}?`)) {
                      returnFromInstallationMutation.mutate(returnQuantity);
                    }
                  }}
                  disabled={returnFromInstallationMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {returnFromInstallationMutation.isLoading ? 'Returning...' : `Return ${returnQuantity} Item${returnQuantity !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationManagementModal;
