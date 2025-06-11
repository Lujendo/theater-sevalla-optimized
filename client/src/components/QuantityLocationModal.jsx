import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Input, Select } from './ui';
import { toast } from 'react-toastify';

const QuantityLocationModal = ({ isOpen, onClose, equipment }) => {
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch locations for dropdown
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/locations');
        return response.data.locations || response.data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // Fetch current inventory allocations
  const { data: inventoryAllocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ['inventoryAllocations', equipment?.id],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/inventory/equipment/${equipment.id}/allocations`);
        return response.data;
      } catch (error) {
        console.error('Error fetching inventory allocations:', error);
        return [];
      }
    },
    enabled: isOpen && !!equipment?.id
  });

  // Initialize allocations when modal opens
  useEffect(() => {
    if (isOpen && equipment) {
      if (inventoryAllocations && inventoryAllocations.length > 0) {
        // Use existing allocations
        setAllocations(inventoryAllocations);
      } else {
        // Create default allocation for all items at current location
        const totalQuantity = equipment.quantity || 1;
        setAllocations([{
          id: null, // New allocation
          location_id: equipment.location_id || '',
          location_name: equipment.location || '',
          quantity: totalQuantity,
          status: equipment.status || 'available'
        }]);
      }
      setError('');
    }
  }, [isOpen, equipment, inventoryAllocations]);

  // Update inventory allocations mutation
  const updateAllocationsMutation = useMutation({
    mutationFn: async (allocationsData) => {
      const response = await axios.put(`/api/inventory/equipment/${equipment.id}/allocations`, {
        allocations: allocationsData
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment', equipment.id]);
      queryClient.invalidateQueries(['inventoryAllocations', equipment.id]);
      queryClient.invalidateQueries(['equipmentAvailability', equipment.id]);
      toast.success('Location allocations updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update allocations: ${error.response?.data?.message || error.message}`);
    }
  });

  // Handle allocation change
  const handleAllocationChange = (index, field, value) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };

    // If location_id changes, update location_name accordingly
    if (field === 'location_id') {
      if (value && value !== '') {
        // Predefined location selected - set location_name from database and clear custom location
        const locationsArray = Array.isArray(locations) ? locations : [];
        const selectedLocation = locationsArray.find(loc => loc.id.toString() === value);
        if (selectedLocation) {
          newAllocations[index].location_name = selectedLocation.name;
          newAllocations[index].location_id = value;
        }
      } else {
        // Custom location selected - clear location_id but keep location_name for custom entry
        newAllocations[index].location_id = '';
        // Don't clear location_name here - let user enter custom location
      }
    }

    // If location_name changes and location_id is set, clear location_id to use custom location
    if (field === 'location_name' && newAllocations[index].location_id) {
      newAllocations[index].location_id = '';
    }

    setAllocations(newAllocations);
  };

  // Add new allocation
  const addAllocation = () => {
    setAllocations([...allocations, {
      id: null,
      location_id: '',
      location_name: '',
      quantity: 1,
      status: 'available'
    }]);
  };

  // Remove allocation
  const removeAllocation = (index) => {
    if (allocations.length > 1) {
      const newAllocations = allocations.filter((_, i) => i !== index);
      setAllocations(newAllocations);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate allocations
    const totalQuantity = equipment.quantity || 1;
    const allocatedQuantity = allocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 0), 0);

    if (allocatedQuantity !== totalQuantity) {
      setError(`Total allocated quantity (${allocatedQuantity}) must equal equipment quantity (${totalQuantity})`);
      return;
    }

    // Validate that all allocations have locations
    const invalidAllocations = allocations.filter(alloc => !alloc.location_id && !alloc.location_name);
    if (invalidAllocations.length > 0) {
      setError('All allocations must have a location specified');
      return;
    }

    // Prepare data for submission
    const submitData = allocations.map(alloc => ({
      id: alloc.id,
      location_id: alloc.location_id ? parseInt(alloc.location_id) : null,
      location_name: alloc.location_name,
      quantity: parseInt(alloc.quantity) || 1,
      status: alloc.status
    }));

    updateAllocationsMutation.mutate(submitData);
  };

  // Handle cancel
  const handleCancel = () => {
    setAllocations([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const locationsArray = Array.isArray(locations) ? locations : [];
  const totalQuantity = equipment?.quantity || 1;
  const allocatedQuantity = allocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Manage Item Locations</h2>
              <p className="text-sm text-slate-600">
                {equipment?.brand} {equipment?.model} • {totalQuantity} items total
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Quantity Summary */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-700">Total Equipment Quantity:</span>
                <span className="ml-2 text-lg font-bold text-slate-800">{totalQuantity}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-700">Allocated:</span>
                <span className={`ml-2 text-lg font-bold ${allocatedQuantity === totalQuantity ? 'text-green-600' : 'text-red-600'}`}>
                  {allocatedQuantity}
                </span>
              </div>
            </div>
            {allocatedQuantity !== totalQuantity && (
              <p className="text-sm text-red-600 mt-2">
                {allocatedQuantity > totalQuantity ? 'Over-allocated' : 'Under-allocated'} by {Math.abs(allocatedQuantity - totalQuantity)} items
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Allocations List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-medium text-slate-800">Location Allocations</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllocation}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Location
                </Button>
              </div>

              {allocations.map((allocation, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Location Selection */}
                    <div className="md:col-span-2">
                      <Select
                        label="Location"
                        value={allocation.location_id || ''}
                        onChange={(e) => handleAllocationChange(index, 'location_id', e.target.value)}
                        options={[
                          { value: '', label: 'Custom Location (enter below)' },
                          ...locationsArray.map((location) => ({
                            value: location.id.toString(),
                            label: `${location.name}${location.city ? ` (${location.city})` : ''}`,
                          }))
                        ]}
                        disabled={locationsLoading}
                      />
                      <Input
                        label="Custom Location Name"
                        value={allocation.location_name || ''}
                        onChange={(e) => handleAllocationChange(index, 'location_name', e.target.value)}
                        placeholder="Enter custom location name"
                        className="mt-2"
                        disabled={allocation.location_id && allocation.location_id !== ''}
                        helpText={allocation.location_id && allocation.location_id !== '' ? 'Clear location dropdown to use custom location' : 'Used when no predefined location is selected'}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        max={totalQuantity}
                        value={allocation.quantity}
                        onChange={(e) => handleAllocationChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-end">
                      {allocations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllocation(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={updateAllocationsMutation.isLoading || allocatedQuantity !== totalQuantity}
              >
                {updateAllocationsMutation.isLoading ? 'Updating...' : 'Update Locations'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuantityLocationModal;
