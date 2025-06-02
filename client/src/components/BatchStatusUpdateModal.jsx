import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEquipmentStatus } from '../services/equipmentService';

const BatchStatusUpdateModal = ({ isOpen, onClose, equipmentId, selectedItems = [] }) => {
  // Use selectedItems if provided, otherwise use single equipmentId
  const equipmentIds = selectedItems.length > 0 ? selectedItems : (equipmentId ? [equipmentId] : []);
  const [status, setStatus] = useState('available');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Status options
  const statusOptions = ['available', 'in-use', 'maintenance'];

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data) => {
      // Create an array of promises to update all equipment items
      const updatePromises = data.equipmentIds.map(id =>
        updateEquipmentStatus(id, data.status)
      );
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      setSuccess(`Status successfully updated to ${status} for ${equipmentIds.length} item${equipmentIds.length !== 1 ? 's' : ''}`);
      setIsLoading(false);

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || 'Failed to update status');
      setIsLoading(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (equipmentIds.length === 0) {
      setError('No equipment items selected');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    updateStatusMutation.mutate({
      equipmentIds,
      status
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Update Equipment Status</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            You are updating the status of {equipmentIds.length} item{equipmentIds.length !== 1 ? 's' : ''}.
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
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
              New Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md"
              required
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-slate-600
                hover:bg-slate-50 border border-slate-300 hover:border-slate-400
                hover:shadow-sm transition-all"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-primary-600
                hover:bg-primary-50 border border-primary-500 hover:border-primary-600
                hover:shadow-sm transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchStatusUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  equipmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedItems: PropTypes.array,
};

export default BatchStatusUpdateModal;
