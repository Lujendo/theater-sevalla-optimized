import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { CheckIcon, XIcon } from './Icons';
import { updateShowEquipment } from '../services/showService';

const InlineStatusEdit = ({ showEquipment, showId, onCancel }) => {
  const queryClient = useQueryClient();
  const selectRef = useRef(null);

  const [status, setStatus] = useState(showEquipment.status);
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const statusOptions = [
    { value: 'requested', label: 'Requested', color: 'bg-blue-100 text-blue-800' },
    { value: 'allocated', label: 'Allocated', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'checked-out', label: 'Checked Out', color: 'bg-orange-100 text-orange-800' },
    { value: 'in-use', label: 'In Use', color: 'bg-red-100 text-red-800' },
    { value: 'returned', label: 'Returned', color: 'bg-green-100 text-green-800' }
  ];

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  // Validate status change when status is selected
  const validateStatusChange = async (newStatus) => {
    if (newStatus === showEquipment.status) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await axios.post(`/api/show-equipment/allocation/${showEquipment.id}/validate-status`, {
        newStatus,
        quantity: showEquipment.quantity_allocated
      });
      setValidation(response.data);
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        valid: false,
        conflicts: [{
          type: 'validation_error',
          message: 'Failed to validate status change',
          severity: 'error'
        }],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Update mutation using the validated endpoint
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.put(`/api/show-equipment/allocation/${showEquipment.id}`, {
        status: data.status,
        notes: data.notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['equipmentAvailability']);
      toast.success('Status updated successfully');
      onCancel();
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.conflicts) {
        toast.error(`Status change blocked: ${errorData.conflicts[0]?.message}`);
      } else {
        toast.error(errorData?.message || 'Failed to update status');
      }
    }
  });

  const handleSave = () => {
    if (status === showEquipment.status) {
      onCancel();
      return;
    }

    // Check validation before saving
    if (validation && !validation.valid) {
      toast.error('Cannot save: Status change is not allowed');
      return;
    }

    const updateData = {
      status: status,
      notes: showEquipment.notes || ''
    };

    updateMutation.mutate(updateData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        ref={selectRef}
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          validateStatusChange(e.target.value);
        }}
        onKeyDown={handleKeyPress}
        className={`px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          validation && !validation.valid ? 'border-red-300' : 'border-slate-300'
        }`}
        disabled={updateMutation.isLoading || isValidating}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleSave}
          disabled={
            updateMutation.isLoading ||
            isValidating ||
            (validation && !validation.valid)
          }
          className={`p-1 rounded transition-colors ${
            validation && !validation.valid
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
          }`}
          title={validation && !validation.valid ? 'Status change not allowed' : 'Save'}
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          disabled={updateMutation.isLoading}
          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          title="Cancel"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InlineStatusEdit;
