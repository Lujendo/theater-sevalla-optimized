import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { updateEquipmentType } from '../services/equipmentService';
import Button from './ui/Button';

const BatchTypeUpdateModal = ({ isOpen, onClose, selectedItems = [] }) => {
  const [typeId, setTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Fetch equipment types for dropdown
  const { data: typesData, isLoading: isTypesLoading } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  // Initialize with first type when data is loaded
  useEffect(() => {
    if (typesData?.types && typesData.types.length > 0 && !typeId) {
      setTypeId(typesData.types[0].id.toString());
    }
  }, [typesData, typeId]);

  // Update type mutation
  const updateTypeMutation = useMutation({
    mutationFn: async (data) => {
      // Create an array of promises to update all equipment items
      const updatePromises = data.equipmentIds.map(id =>
        updateEquipmentType(id, data.typeId)
      );
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      const typeName = typesData?.types.find(type => type.id.toString() === typeId)?.name || 'selected type';
      setSuccess(`Type successfully updated to ${typeName} for ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setIsLoading(false);

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error updating type:', error);
      setError(error.response?.data?.message || 'Failed to update type');
      setIsLoading(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError('No equipment items selected');
      return;
    }

    if (!typeId) {
      setError('Please select a type');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    updateTypeMutation.mutate({
      equipmentIds: selectedItems,
      typeId
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Update Equipment Type</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            You are updating the type of {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">
              New Type
            </label>
            <select
              id="type"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md"
              required
            >
              <option value="">Select a type</option>
              {typesData?.types && typesData.types.length > 0 ? (
                typesData.types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading types...</option>
              )}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || !typeId}
            >
              {isLoading ? 'Updating...' : 'Update Type'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchTypeUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedItems: PropTypes.array
};

export default BatchTypeUpdateModal;
