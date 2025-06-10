import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card, Button, Input } from './ui';
import axios from 'axios';

const AllocateToShowModal = ({ isOpen, onClose, equipment, availabilityData }) => {
  const queryClient = useQueryClient();
  const [selectedShow, setSelectedShow] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch shows with aggressive refresh
  const { data: shows, isLoading: showsLoading, refetch: refetchShows } = useQuery({
    queryKey: ['shows'],
    queryFn: async () => {
      console.log('🔄 Fetching shows list');
      const response = await axios.get('/api/shows');
      console.log('📋 Shows data:', response.data);
      return response.data;
    },
    enabled: isOpen,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Fetch show allocations for this equipment with aggressive refresh
  const { data: showAllocations, isLoading: allocationsLoading, refetch: refetchAllocations } = useQuery({
    queryKey: ['equipmentShowAllocations', equipment?.id],
    queryFn: async () => {
      console.log('🔄 Fetching show allocations for equipment:', equipment?.id);
      const response = await axios.get(`/api/show-equipment/equipment/${equipment.id}/shows`);
      console.log('📋 Show allocations:', response.data);
      return response.data;
    },
    enabled: !!equipment?.id && isOpen,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Helper function to check if equipment is already allocated to a show
  const isAllocatedToShow = (showId) => {
    return showAllocations?.some(allocation => allocation.show_id === parseInt(showId));
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');

    // Invalidate all queries
    queryClient.invalidateQueries(['equipmentAvailability', equipment?.id]);
    queryClient.invalidateQueries(['shows']);
    queryClient.invalidateQueries(['equipmentShowAllocations', equipment?.id]);
    queryClient.invalidateQueries(['equipment', equipment?.id]);

    // Refetch all data
    await Promise.all([
      queryClient.refetchQueries(['equipmentAvailability', equipment?.id]),
      queryClient.refetchQueries(['shows']),
      queryClient.refetchQueries(['equipmentShowAllocations', equipment?.id]),
      queryClient.refetchQueries(['equipment', equipment?.id])
    ]);

    // Reset form state
    setSelectedShow('');
    setQuantity(1);
    setNotes('');
    setErrors({});
    setExistingAllocation(null);
    setIsUpdating(false);

    toast.success('Data refreshed successfully!');
  };

  // Reset form and refresh data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal opened - refreshing all data');
      setSelectedShow('');
      setQuantity(1);
      setNotes('');
      setErrors({});
      setExistingAllocation(null);
      setIsUpdating(false);

      // Force refresh all relevant data when modal opens
      queryClient.invalidateQueries(['equipmentAvailability', equipment?.id]);
      queryClient.invalidateQueries(['shows']);
      queryClient.invalidateQueries(['equipmentShowAllocations', equipment?.id]);
      queryClient.invalidateQueries(['equipment', equipment?.id]); // Refresh equipment details

      // Also refetch immediately to ensure fresh data
      setTimeout(() => {
        queryClient.refetchQueries(['equipmentAvailability', equipment?.id]);
        queryClient.refetchQueries(['shows']);
        queryClient.refetchQueries(['equipmentShowAllocations', equipment?.id]);
        queryClient.refetchQueries(['equipment', equipment?.id]);
      }, 100); // Small delay to ensure queries are set up
    }
  }, [isOpen, queryClient, equipment?.id]);

  // Check for existing allocation when show is selected
  useEffect(() => {
    const checkExistingAllocation = async () => {
      if (selectedShow && equipment?.id) {
        try {
          console.log('🔍 Checking for existing allocation:', { showId: selectedShow, equipmentId: equipment.id });
          const response = await axios.get(`/api/show-equipment/show/${selectedShow}/equipment/${equipment.id}`);
          if (response.data) {
            console.log('✅ Found existing allocation:', response.data);
            setExistingAllocation(response.data);
            setQuantity(response.data.quantity_needed || response.data.quantity_allocated || 1);
            setNotes(response.data.notes || '');
            setIsUpdating(true);
          } else {
            console.log('ℹ️ No existing allocation found');
            setExistingAllocation(null);
            setQuantity(1);
            setNotes('');
            setIsUpdating(false);
          }
        } catch (error) {
          // No existing allocation found, which is fine for 404 errors
          if (error.response?.status === 404) {
            console.log('ℹ️ No existing allocation found - this is expected');
          } else {
            console.error('❌ Error checking for existing allocation:', error.response?.status, error.message);
          }
          setExistingAllocation(null);
          setQuantity(1);
          setNotes('');
          setIsUpdating(false);
        }
      }
    };

    if (selectedShow) {
      checkExistingAllocation();
    }
  }, [selectedShow, equipment?.id]);

  // Allocation mutation (handles both create and update)
  const allocateMutation = useMutation({
    mutationFn: async (data) => {
      if (isUpdating && existingAllocation) {
        // Update existing allocation using the specific allocation endpoint
        console.log('Updating allocation:', { allocationId: existingAllocation.id, quantity: data.quantity, notes: data.notes });
        const response = await axios.put(`/api/show-equipment/allocation/${existingAllocation.id}`, {
          quantityNeeded: data.quantity,
          notes: data.notes
        });
        return response.data;
      } else {
        // Create new allocation
        console.log('Creating new allocation:', { showId: data.showId, equipmentId: equipment.id, quantity: data.quantity, notes: data.notes });
        const response = await axios.post(`/api/show-equipment/show/${data.showId}/equipment`, {
          equipmentId: equipment.id,
          quantityNeeded: data.quantity,
          notes: data.notes
        });
        return response.data;
      }
    },
    onSuccess: () => {
      const message = isUpdating ? 'Equipment allocation updated successfully!' : 'Equipment allocated to show successfully!';
      toast.success(message);
      queryClient.invalidateQueries(['equipmentAvailability', equipment.id]);
      queryClient.invalidateQueries(['equipmentShowAllocations', equipment.id]);
      queryClient.invalidateQueries(['equipment', equipment.id]); // Refresh equipment details
      queryClient.invalidateQueries(['showEquipment']);
      queryClient.invalidateQueries(['shows']); // Refresh shows data
      onClose();
    },
    onError: (error) => {
      const message = isUpdating ? 'Failed to update equipment allocation' : 'Failed to allocate equipment';
      toast.error(error.response?.data?.message || message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!selectedShow) {
      newErrors.show = 'Please select a show';
    }
    if (!quantity || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    // Use enhanced availability calculation
    const effectivelyAvailable = availabilityData.effectively_available || availabilityData.available_quantity;

    // For updates, allow using currently allocated quantity + effectively available quantity
    const maxAllowedQuantity = isUpdating && existingAllocation
      ? effectivelyAvailable + (existingAllocation.quantity_allocated || existingAllocation.quantity_needed || 0)
      : effectivelyAvailable;

    if (availabilityData && quantity > maxAllowedQuantity) {
      if (isUpdating) {
        newErrors.quantity = `Maximum ${maxAllowedQuantity} units allowed (${effectivelyAvailable} effectively available + ${existingAllocation.quantity_allocated || existingAllocation.quantity_needed || 0} currently allocated)`;
      } else {
        // Check if there are reserved items that could be used
        const totalReserved = availabilityData.total_reserved || 0;
        if (totalReserved > 0 && quantity <= (effectivelyAvailable + totalReserved)) {
          newErrors.quantity = `Only ${effectivelyAvailable} units immediately available. ${totalReserved} units are reserved (requested but not allocated). Total potential: ${effectivelyAvailable + totalReserved}`;
        } else {
          newErrors.quantity = `Only ${effectivelyAvailable} units available`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    allocateMutation.mutate({
      showId: selectedShow,
      quantity: parseInt(quantity),
      notes
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                {isUpdating ? 'Update Show Allocation' : 'Allocate to Show'}
              </h2>
              {isUpdating && existingAllocation && (
                <p className="text-sm text-blue-600 mt-1">
                  Updating existing allocation for this equipment
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={showsLoading || allocationsLoading}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                title="Refresh data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${(showsLoading || allocationsLoading) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {(showsLoading || allocationsLoading) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-700">Refreshing data...</span>
              </div>
            </div>
          )}

          {/* Equipment Info */}
          <Card className="mb-6">
            <Card.Body>
              <h3 className="font-medium text-slate-800 mb-2">Equipment</h3>
              <p className="text-sm text-slate-600">
                {equipment.brand} {equipment.model} • {equipment.serial_number}
              </p>

              {/* Existing Allocation Info */}
              {isUpdating && existingAllocation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Current Allocation</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-600">Status:</span>
                      <span className="ml-2 font-medium text-blue-800">{existingAllocation.status}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Allocated:</span>
                      <span className="ml-2 font-medium text-blue-800">{existingAllocation.quantity_allocated}</span>
                    </div>
                  </div>
                </div>
              )}

              {availabilityData && (
                <div className="mt-3">
                  {/* Enhanced Status-based Availability Display */}
                  <div className="grid grid-cols-4 gap-3 text-center bg-slate-50 p-3 rounded mb-3">
                    <div>
                      <div className="text-lg font-bold text-slate-800">{availabilityData.total_quantity}</div>
                      <div className="text-xs text-slate-600">Total</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{availabilityData.total_unavailable || 0}</div>
                      <div className="text-xs text-slate-600">Unavailable</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">{availabilityData.total_reserved || 0}</div>
                      <div className="text-xs text-slate-600">Reserved</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${availabilityData.effectively_available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {availabilityData.effectively_available || availabilityData.available_quantity}
                      </div>
                      <div className="text-xs text-slate-600">Available</div>
                    </div>
                  </div>

                  {/* Status Warnings */}
                  {availabilityData.warnings && availabilityData.warnings.length > 0 && (
                    <div className="space-y-2">
                      {availabilityData.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-sm ${
                            warning.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                            warning.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <div className="font-medium">{warning.message}</div>
                          {warning.details && (
                            <div className="text-xs mt-1 opacity-75">
                              {warning.type === 'info' && warning.details.shows > 0 && `Shows: ${warning.details.shows}`}
                              {warning.type === 'info' && warning.details.inventory > 0 && ` Inventory: ${warning.details.inventory}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Detailed Status Breakdown (Collapsible) */}
                  {(availabilityData.show_status_breakdown || availabilityData.inventory_status_breakdown) && (
                    <details className="mt-3">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                        View detailed status breakdown
                      </summary>
                      <div className="mt-2 p-2 bg-slate-100 rounded text-xs">
                        {availabilityData.show_status_breakdown && Object.keys(availabilityData.show_status_breakdown).length > 0 && (
                          <div className="mb-2">
                            <div className="font-medium text-slate-700">Show Allocations:</div>
                            {Object.entries(availabilityData.show_status_breakdown).map(([status, quantity]) => (
                              <div key={status} className="flex justify-between">
                                <span className="capitalize">{status.replace('-', ' ')}:</span>
                                <span>{quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {availabilityData.inventory_status_breakdown && Object.keys(availabilityData.inventory_status_breakdown).length > 0 && (
                          <div>
                            <div className="font-medium text-slate-700">Inventory Allocations:</div>
                            {Object.entries(availabilityData.inventory_status_breakdown).map(([status, quantity]) => (
                              <div key={status} className="flex justify-between">
                                <span className="capitalize">{status.replace('-', ' ')}:</span>
                                <span>{quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Allocation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="show-select" className="block text-sm font-medium text-slate-700 mb-2">
                Select Show *
              </label>
              {showsLoading ? (
                <div className="text-sm text-slate-500">Loading shows...</div>
              ) : (
                <select
                  id="show-select"
                  name="show"
                  value={selectedShow}
                  onChange={(e) => setSelectedShow(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.show ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">Choose a show...</option>
                  {shows?.shows?.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.name} {show.date ? `- ${new Date(show.date).toLocaleDateString()}` : ''}
                      {isAllocatedToShow(show.id) ? ' (Already allocated)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.show && (
                <p className="mt-1 text-sm text-red-600">{errors.show}</p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-2">
                Quantity *
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={availabilityData ? (isUpdating && existingAllocation
                  ? (availabilityData.effectively_available || availabilityData.available_quantity) + (existingAllocation.quantity_allocated || existingAllocation.quantity_needed || 0)
                  : (availabilityData.effectively_available || availabilityData.available_quantity)) : 999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={errors.quantity ? 'border-red-300' : ''}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional notes about this allocation..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={allocateMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={allocateMutation.isLoading || (!isUpdating && availabilityData && (availabilityData.effectively_available || availabilityData.available_quantity) === 0)}
                className="flex items-center"
              >
                {allocateMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isUpdating ? 'Updating...' : 'Allocating...'}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {isUpdating ? 'Update Allocation' : 'Allocate to Show'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AllocateToShowModal;
