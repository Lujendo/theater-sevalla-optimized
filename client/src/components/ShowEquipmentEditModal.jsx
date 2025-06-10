import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Card, Button, Input } from './ui';
import { EditIcon, SaveIcon, XIcon } from './Icons';
import { updateShowEquipment } from '../services/showService';

// Utility function to calculate missing quantity
const calculateMissingQuantity = (quantityNeeded, quantityAllocated) => {
  const needed = parseInt(quantityNeeded) || 0;
  const allocated = parseInt(quantityAllocated) || 0;
  return Math.max(0, needed - allocated);
};

const ShowEquipmentEditModal = ({ showEquipment, onClose, showId }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    quantityNeeded: showEquipment?.quantity_needed || 1,
    quantityAllocated: showEquipment?.quantity_allocated || 0,
    status: showEquipment?.status || 'requested',
    notes: showEquipment?.notes || ''
  });

  const [errors, setErrors] = useState({});
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Fetch equipment availability
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['equipmentAvailability', showEquipment?.equipment_id],
    queryFn: async () => {
      if (!showEquipment?.equipment_id) return null;
      const response = await axios.get(`/api/show-equipment/equipment/${showEquipment.equipment_id}/availability`);
      return response.data;
    },
    enabled: !!showEquipment?.equipment_id
  });

  // Status options for show equipment
  const statusOptions = [
    { value: 'requested', label: 'Requested', color: 'bg-blue-100 text-blue-800' },
    { value: 'allocated', label: 'Allocated', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'checked-out', label: 'Checked Out', color: 'bg-orange-100 text-orange-800' },
    { value: 'in-use', label: 'In Use', color: 'bg-red-100 text-red-800' },
    { value: 'returned', label: 'Returned', color: 'bg-green-100 text-green-800' }
  ];

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
        quantity: formData.quantityAllocated || formData.quantityNeeded
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
        quantityNeeded: data.quantityNeeded,
        quantityAllocated: data.quantityAllocated,
        notes: data.notes,
        status: data.status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['show', showId]);
      queryClient.invalidateQueries(['equipmentAvailability']);
      // Also invalidate equipment-specific queries for Equipment Details page
      queryClient.invalidateQueries(['equipmentShowAllocations', showEquipment?.equipment_id]);
      queryClient.invalidateQueries(['equipmentAvailability', showEquipment?.equipment_id]);
      toast.success('Equipment allocation updated successfully');
      onClose();
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.conflicts) {
        toast.error(`Update blocked: ${errorData.conflicts[0]?.message}`);
      } else {
        toast.error(errorData?.message || 'Failed to update equipment');
      }
    }
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.quantityNeeded || formData.quantityNeeded < 1) {
      newErrors.quantityNeeded = 'Quantity needed must be at least 1';
    }

    if (formData.quantityAllocated < 0) {
      newErrors.quantityAllocated = 'Quantity allocated cannot be negative';
    }

    if (formData.quantityAllocated > formData.quantityNeeded) {
      newErrors.quantityAllocated = 'Allocated quantity cannot exceed needed quantity';
    }

    // Check availability for quantity needed
    if (availabilityData && formData.quantityNeeded) {
      const effectivelyAvailable = availabilityData.effectively_available || availabilityData.available_quantity || 0;
      const currentAllocation = showEquipment?.quantity_needed || showEquipment?.quantity_allocated || 0;

      // For updates, we can use the currently allocated quantity plus what's effectively available
      const maxAllowedQuantity = effectivelyAvailable + currentAllocation;

      if (formData.quantityNeeded > maxAllowedQuantity) {
        newErrors.quantityNeeded = `Maximum ${maxAllowedQuantity} units allowed (${effectivelyAvailable} available + ${currentAllocation} currently allocated)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    updateMutation.mutate({
      quantityNeeded: parseInt(formData.quantityNeeded),
      quantityAllocated: parseInt(formData.quantityAllocated),
      status: formData.status,
      notes: formData.notes.trim()
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Validate status change when status is changed
    if (field === 'status') {
      validateStatusChange(value);
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOption?.color || 'bg-gray-100 text-gray-800'}`}>
        {statusOption?.label || status}
      </span>
    );
  };

  if (!showEquipment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center">
            <EditIcon className="w-5 h-5 mr-2" />
            Edit Equipment Allocation
          </h2>
          <Button variant="outline" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Equipment Info */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="font-medium text-slate-800 mb-2">
              {showEquipment.equipment?.type || showEquipment.equipment?.name}
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              {showEquipment.equipment?.brand} {showEquipment.equipment?.model}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-slate-600">Serial:</span>
                <span className="ml-1 font-medium">{showEquipment.equipment?.serial_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-600">Total Qty:</span>
                <span className="ml-1 font-medium">{availabilityData?.total_quantity || showEquipment.equipment?.quantity || 0}</span>
              </div>
              {availabilityData && (
                <div>
                  <span className="text-slate-600">Available:</span>
                  <span className="ml-1 font-medium text-green-600">
                    {availabilityData.effectively_available || availabilityData.available_quantity || 0}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-600">Current Status:</span>
                <span className="ml-2">{getStatusBadge(showEquipment.status)}</span>
              </div>
            </div>

            {/* Availability Details */}
            {availabilityData && !availabilityLoading && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Equipment:</span>
                    <span className="font-medium">{availabilityData.total_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currently Allocated:</span>
                    <span className="font-medium">{availabilityData.total_allocated || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available for Allocation:</span>
                    <span className="font-medium text-green-600">
                      {availabilityData.effectively_available || availabilityData.available_quantity || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Allocation:</span>
                    <span className="font-medium text-blue-600">
                      {showEquipment?.quantity_needed || showEquipment?.quantity_allocated || 0}
                    </span>
                  </div>
                  {/* Missing Quantity Display */}
                  {(() => {
                    const missing = calculateMissingQuantity(
                      formData.quantityNeeded || showEquipment?.quantity_needed,
                      formData.quantityAllocated || showEquipment?.quantity_allocated
                    );
                    return missing > 0 ? (
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-red-600 font-medium">Missing Items:</span>
                        <span className="font-bold text-red-600">
                          {missing}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {availabilityLoading && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400 mr-2"></div>
                  Loading availability data...
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quantity Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity Needed *
                {availabilityData && (
                  <span className="text-xs text-slate-500 ml-2">
                    (Max: {(availabilityData.effectively_available || availabilityData.available_quantity || 0) + (showEquipment?.quantity_needed || showEquipment?.quantity_allocated || 0)})
                  </span>
                )}
              </label>
              <Input
                id="quantityNeeded"
                name="quantityNeeded"
                type="number"
                min="1"
                max={availabilityData ? (availabilityData.effectively_available || availabilityData.available_quantity || 0) + (showEquipment?.quantity_needed || showEquipment?.quantity_allocated || 0) : undefined}
                value={formData.quantityNeeded}
                onChange={(e) => handleInputChange('quantityNeeded', e.target.value)}
                className={errors.quantityNeeded ? 'border-red-300' : ''}
              />
              {errors.quantityNeeded && (
                <p className="mt-1 text-sm text-red-600">{errors.quantityNeeded}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity Allocated
              </label>
              <Input
                id="quantityAllocated"
                name="quantityAllocated"
                type="number"
                min="0"
                max={formData.quantityNeeded}
                value={formData.quantityAllocated}
                onChange={(e) => handleInputChange('quantityAllocated', e.target.value)}
                className={errors.quantityAllocated ? 'border-red-300' : ''}
              />
              {errors.quantityAllocated && (
                <p className="mt-1 text-sm text-red-600">{errors.quantityAllocated}</p>
              )}

              {/* Missing Quantity Alert */}
              {(() => {
                const missing = calculateMissingQuantity(formData.quantityNeeded, formData.quantityAllocated);
                return missing > 0 ? (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-red-800">
                        Missing {missing} item{missing !== 1 ? 's' : ''} - Need to allocate {missing} more
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* Status Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Allocation Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Validation Results */}
            {isValidating && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  Validating status change...
                </div>
              </div>
            )}

            {validation && !isValidating && (
              <div className="mt-2 space-y-2">
                {/* Conflicts (Errors) */}
                {validation.conflicts && validation.conflicts.length > 0 && (
                  <div className="space-y-1">
                    {validation.conflicts.map((conflict, index) => (
                      <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <div className="font-medium text-red-800">❌ {conflict.message}</div>
                        {conflict.conflictingAllocation && (
                          <div className="text-red-600 mt-1">
                            Conflicting with: {conflict.conflictingAllocation.show_name}
                            ({conflict.conflictingAllocation.status})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <div className="font-medium text-yellow-800">⚠️ {warning.message}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Success */}
                {validation.valid && validation.conflicts.length === 0 && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <div className="font-medium text-green-800">✅ Status change is allowed</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows="4"
              placeholder="Add any notes about this equipment allocation..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateMutation.isLoading ||
                isValidating ||
                (validation && !validation.valid)
              }
              className="flex items-center space-x-2"
            >
              <SaveIcon className="w-4 h-4" />
              <span>{updateMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShowEquipmentEditModal;
