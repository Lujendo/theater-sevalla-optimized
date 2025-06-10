import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Button from './Button';

const StatusManager = ({ allocation, onStatusChange }) => {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(allocation.status);
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  // Status definitions with rules
  const statusDefinitions = {
    'requested': {
      label: 'Requested',
      description: 'Pending approval, quantity is reserved',
      color: 'bg-blue-100 text-blue-800',
      nextStatuses: ['allocated', 'cancelled'],
      impact: 'reserved'
    },
    'allocated': {
      label: 'Allocated',
      description: 'Confirmed allocation, quantity is unavailable',
      color: 'bg-orange-100 text-orange-800',
      nextStatuses: ['checked-out', 'cancelled'],
      impact: 'unavailable'
    },
    'checked-out': {
      label: 'Checked Out',
      description: 'Equipment is physically taken, unavailable',
      color: 'bg-purple-100 text-purple-800',
      nextStatuses: ['in-use', 'returned'],
      impact: 'unavailable'
    },
    'in-use': {
      label: 'In Use',
      description: 'Equipment is actively being used, unavailable',
      color: 'bg-red-100 text-red-800',
      nextStatuses: ['returned'],
      impact: 'unavailable'
    },
    'returned': {
      label: 'Returned',
      description: 'Equipment is back, quantity is available',
      color: 'bg-green-100 text-green-800',
      nextStatuses: ['allocated'],
      impact: 'available'
    },
    'cancelled': {
      label: 'Cancelled',
      description: 'Request was cancelled, equipment is available',
      color: 'bg-gray-100 text-gray-800',
      nextStatuses: ['requested'],
      impact: 'available'
    }
  };

  // Validate status change when status is selected
  const validateStatusChange = async (newStatus) => {
    if (newStatus === allocation.status) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await axios.post(`/api/show-equipment/allocation/${allocation.id}/validate-status`, {
        newStatus,
        quantity: allocation.quantity_allocated
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

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ newStatus, notes }) => {
      const response = await axios.put(`/api/show-equipment/allocation/${allocation.id}`, {
        status: newStatus,
        notes: notes ? `${allocation.notes || ''}\n[${new Date().toLocaleString()}] Status changed to ${newStatus}: ${notes}` : allocation.notes
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Status changed to ${statusDefinitions[selectedStatus].label}`);
      queryClient.invalidateQueries(['equipmentAvailability']);
      queryClient.invalidateQueries(['equipmentShowAllocations']);
      queryClient.invalidateQueries(['showEquipment']);
      setIsChanging(false);
      setNotes('');
      setValidation(null);
      if (onStatusChange) {
        onStatusChange(data);
      }
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.conflicts) {
        toast.error(`Status change blocked: ${errorData.conflicts[0]?.message}`);
      } else {
        toast.error(errorData?.message || 'Failed to change status');
      }
    }
  });

  const handleStatusChange = () => {
    if (selectedStatus === allocation.status) {
      setIsChanging(false);
      return;
    }

    statusMutation.mutate({
      newStatus: selectedStatus,
      notes: notes
    });
  };

  const currentStatus = statusDefinitions[allocation.status];
  const selectedStatusDef = statusDefinitions[selectedStatus];

  if (!isChanging) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
        <button
          onClick={() => setIsChanging(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Change Status
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-800">Change Status</h4>
        <button
          onClick={() => {
            setIsChanging(false);
            setSelectedStatus(allocation.status);
            setNotes('');
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {/* Current Status */}
      <div className="text-sm">
        <span className="text-slate-600">Current: </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
        <div className="text-xs text-slate-500 mt-1">{currentStatus.description}</div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          New Status
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            validateStatusChange(e.target.value);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={allocation.status}>{currentStatus.label} (Current)</option>
          {currentStatus.nextStatuses.map(status => (
            <option key={status} value={status}>
              {statusDefinitions[status].label}
            </option>
          ))}
        </select>
        {selectedStatus !== allocation.status && (
          <div className="mt-1 text-xs text-slate-600">
            <div className={`inline-block px-2 py-1 rounded ${selectedStatusDef.color}`}>
              {selectedStatusDef.description}
            </div>
            <div className="mt-1">
              <strong>Impact:</strong> Equipment will be{' '}
              <span className={selectedStatusDef.impact === 'available' ? 'text-green-600' :
                             selectedStatusDef.impact === 'reserved' ? 'text-orange-600' : 'text-red-600'}>
                {selectedStatusDef.impact}
              </span>
            </div>
          </div>
        )}

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

            {/* Current Allocations Info */}
            {validation.currentAllocations && validation.currentAllocations.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-800">
                  View other allocations ({validation.currentAllocations.length})
                </summary>
                <div className="mt-1 space-y-1">
                  {validation.currentAllocations.map((alloc, index) => (
                    <div key={index} className="p-1 bg-slate-100 rounded">
                      <strong>{alloc.show_name}:</strong> {alloc.status} ({alloc.quantity_allocated} units)
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this status change..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Button
          onClick={handleStatusChange}
          variant="primary"
          disabled={
            statusMutation.isLoading ||
            selectedStatus === allocation.status ||
            isValidating ||
            (validation && !validation.valid)
          }
          className="flex items-center"
        >
          {statusMutation.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </>
          ) : (
            `Change to ${selectedStatusDef.label}`
          )}
        </Button>
        <Button
          onClick={() => {
            setIsChanging(false);
            setSelectedStatus(allocation.status);
            setNotes('');
          }}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default StatusManager;
