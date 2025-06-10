import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { CheckIcon, XIcon } from './Icons';
import { updateShowEquipment } from '../services/showService';

const InlineQuantityEdit = ({ 
  showEquipment, 
  field, // 'quantityNeeded' or 'quantityAllocated'
  showId,
  onCancel 
}) => {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  
  const [value, setValue] = useState(
    field === 'quantityNeeded' 
      ? showEquipment.quantity_needed 
      : showEquipment.quantity_allocated
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => updateShowEquipment(showEquipment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      toast.success(`${field === 'quantityNeeded' ? 'Needed' : 'Allocated'} quantity updated`);
      onCancel();
    },
    onError: (error) => {
      toast.error(`Failed to update quantity: ${error.message}`);
      setError(error.message);
    }
  });

  const validate = (newValue) => {
    const numValue = parseInt(newValue);
    
    if (isNaN(numValue) || numValue < 0) {
      return 'Quantity must be a positive number';
    }

    if (field === 'quantityNeeded' && numValue < 1) {
      return 'Quantity needed must be at least 1';
    }

    if (field === 'quantityAllocated') {
      const maxAllowed = field === 'quantityNeeded' 
        ? numValue 
        : showEquipment.quantity_needed;
      
      if (numValue > maxAllowed) {
        return `Cannot exceed ${maxAllowed} (quantity needed)`;
      }
    }

    return '';
  };

  const handleSave = () => {
    const validationError = validate(value);
    if (validationError) {
      setError(validationError);
      return;
    }

    const updateData = {
      quantityNeeded: showEquipment.quantity_needed,
      quantityAllocated: showEquipment.quantity_allocated,
      status: showEquipment.status,
      notes: showEquipment.notes || ''
    };

    // Update the specific field
    if (field === 'quantityNeeded') {
      updateData.quantityNeeded = parseInt(value);
      // If needed quantity is reduced below allocated, adjust allocated
      if (updateData.quantityAllocated > parseInt(value)) {
        updateData.quantityAllocated = parseInt(value);
      }
    } else {
      updateData.quantityAllocated = parseInt(value);
    }

    updateMutation.mutate(updateData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Clear error when user types
    if (error) {
      setError('');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-slate-300'
          }`}
          disabled={updateMutation.isLoading}
        />
        {error && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleSave}
          disabled={updateMutation.isLoading}
          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
          title="Save"
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

export default InlineQuantityEdit;
