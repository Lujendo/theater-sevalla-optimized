import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEquipmentBrandModel } from '../services/equipmentService';
import Button from './ui/Button';

const BatchBrandModelUpdateModal = ({ isOpen, onClose, selectedItems = [] }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [updateBrand, setUpdateBrand] = useState(true);
  const [updateModel, setUpdateModel] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Update brand/model mutation
  const updateBrandModelMutation = useMutation({
    mutationFn: async (data) => {
      // Create an array of promises to update all equipment items
      const updatePromises = data.equipmentIds.map(id =>
        updateEquipmentBrandModel(id, data.updateData)
      );
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);

      let successMessage = 'Successfully updated ';
      if (updateBrand && updateModel) {
        successMessage += `brand to "${brand}" and model to "${model}"`;
      } else if (updateBrand) {
        successMessage += `brand to "${brand}"`;
      } else if (updateModel) {
        successMessage += `model to "${model}"`;
      }

      setSuccess(`${successMessage} for ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setIsLoading(false);

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error updating brand/model:', error);
      setError(error.response?.data?.message || 'Failed to update brand/model');
      setIsLoading(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError('No equipment items selected');
      return;
    }

    if (!updateBrand && !updateModel) {
      setError('Please select at least one field to update');
      return;
    }

    if ((updateBrand && !brand) || (updateModel && !model)) {
      setError('Please fill in all selected fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const updateData = {};
    if (updateBrand) updateData.brand = brand;
    if (updateModel) updateData.model = model;

    updateBrandModelMutation.mutate({
      equipmentIds: selectedItems,
      updateData
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Update Brand & Model</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            You are updating {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}.
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
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="updateBrand"
                checked={updateBrand}
                onChange={(e) => setUpdateBrand(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="updateBrand" className="text-sm font-medium text-slate-700">
                Update Brand
              </label>
            </div>

            <input
              type="text"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={!updateBrand}
              className={`w-full p-2 border border-slate-300 rounded-md ${!updateBrand ? 'bg-slate-100' : ''}`}
              placeholder="Enter new brand"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="updateModel"
                checked={updateModel}
                onChange={(e) => setUpdateModel(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="updateModel" className="text-sm font-medium text-slate-700">
                Update Model
              </label>
            </div>

            <input
              type="text"
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!updateModel}
              className={`w-full p-2 border border-slate-300 rounded-md ${!updateModel ? 'bg-slate-100' : ''}`}
              placeholder="Enter new model"
            />
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
              disabled={isLoading || (!updateBrand && !updateModel) || (updateBrand && !brand) || (updateModel && !model)}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchBrandModelUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedItems: PropTypes.array
};

export default BatchBrandModelUpdateModal;
