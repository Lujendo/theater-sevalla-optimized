import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import InstallationManagementModal from './InstallationManagementModal';

const LocationAllocationManager = ({ equipment, locations, onClose, isOpen }) => {
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAllocations, setCurrentAllocations] = useState([]);
  const [viewMode, setViewMode] = useState('allocations'); // 'allocations' or 'installation'
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch equipment availability data to get accurate available quantities
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['equipmentAvailability', equipment?.id],
    queryFn: async () => {
      if (!equipment?.id) return null;
      const response = await axios.get(`/api/equipment/${equipment.id}/availability`);
      return response.data;
    },
    enabled: !!equipment?.id && isOpen
  });

  // Initialize allocations when modal opens
  useEffect(() => {
    if (isOpen && equipment) {
      fetchCurrentAllocations();
    }
  }, [isOpen, equipment]);

  // Fetch current allocations from the backend
  const fetchCurrentAllocations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/equipment/${equipment.id}/allocations`);
      const fetchedAllocations = response.data.allocations || [];

      // Store current allocations for reference
      setCurrentAllocations(fetchedAllocations);

      if (fetchedAllocations.length > 0) {
        // Use existing allocations
        setAllocations(fetchedAllocations.map(alloc => ({
          id: alloc.id,
          location_id: alloc.location_id,
          location_name: alloc.location_name || alloc.location?.name || '',
          quantity: alloc.quantity_allocated,
          status: alloc.status,
          notes: alloc.notes || ''
        })));
      } else {
        // Start with empty allocations - user can add what they want to move
        setAllocations([]);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setError('Failed to load current allocations');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new allocation
  const addAllocation = () => {
    setAllocations([...allocations, {
      id: null,
      location_id: '',
      location_name: '',
      quantity: 1,
      status: 'allocated',
      notes: ''
    }]);
  };

  // Remove allocation
  const removeAllocation = (index) => {
    if (allocations.length > 1) {
      setAllocations(allocations.filter((_, i) => i !== index));
    }
  };

  // Helper functions
  const getCurrentlyAllocated = () => {
    return currentAllocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity_allocated) || 0), 0);
  };

  const getUnallocatedQuantity = () => {
    // Use available quantity from availability data (which accounts for show allocations)
    // plus any currently allocated to locations (since we're redistributing)
    const availableForAllocation = (availabilityData?.available_quantity || 0) + getCurrentlyAllocated();
    const currentlyAllocated = getCurrentlyAllocated();
    return availableForAllocation - currentlyAllocated;
  };

  // Get the total quantity available for location allocation (excludes show allocations)
  const getTotalAvailableForLocationAllocation = () => {
    if (!availabilityData) return equipment?.quantity || 1;
    // Available quantity + currently allocated to locations (since we can redistribute those)
    return (availabilityData.available_quantity || 0) + getCurrentlyAllocated();
  };

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === parseInt(locationId));
    return location ? location.name : 'Unknown Location';
  };

  // Update allocation
  const updateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };

    // Handle location_id changes
    if (field === 'location_id') {
      if (value && value !== '') {
        // Predefined location selected - set location_name from database and clear custom location
        const location = locations.find(loc => loc.id.toString() === value.toString());
        if (location) {
          updated[index].location_name = location.name;
          updated[index].location_id = value;
        }
      } else {
        // Custom location selected - clear location_id but keep location_name for custom entry
        updated[index].location_id = '';
        // Don't clear location_name here - let user enter custom location
      }
    }

    // If location_name changes and location_id is set, clear location_id to use custom location
    if (field === 'location_name' && updated[index].location_id) {
      updated[index].location_id = '';
    }

    setAllocations(updated);
  };

  // Save allocations mutation
  const saveAllocationsMutation = useMutation({
    mutationFn: async (allocationData) => {
      const response = await axios.post(`/api/equipment/${equipment.id}/allocations`, {
        allocations: allocationData
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries(['equipment']);
      queryClient.invalidateQueries(['equipment-availability']);
      queryClient.invalidateQueries(['equipmentAvailability']);
      queryClient.invalidateQueries(['equipmentShowAllocations']);
      queryClient.invalidateQueries(['storageAvailability']);
      queryClient.invalidateQueries(['inventoryAllocations']);
      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to save allocations');
    }
  });

  // Enhanced validation
  const validateAllocations = () => {
    const errors = [];
    const totalAvailableForAllocation = getTotalAvailableForLocationAllocation();
    const allocatedQuantity = allocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 0), 0);

    // Check total quantity available for location allocation
    if (allocatedQuantity > totalAvailableForAllocation) {
      const showAllocated = availabilityData?.show_allocated || 0;
      if (showAllocated > 0) {
        errors.push(`Total allocated quantity (${allocatedQuantity}) exceeds available quantity (${totalAvailableForAllocation}). ${showAllocated} items are allocated to shows.`);
      } else {
        errors.push(`Total allocated quantity (${allocatedQuantity}) exceeds available quantity (${totalAvailableForAllocation})`);
      }
    }

    // Check for duplicate locations
    const locationIds = allocations.map(alloc => alloc.location_id).filter(id => id);
    const duplicateLocations = locationIds.filter((id, index) => locationIds.indexOf(id) !== index);
    if (duplicateLocations.length > 0) {
      errors.push('Cannot allocate to the same location multiple times');
    }

    // Check individual allocations
    allocations.forEach((alloc, index) => {
      if (!alloc.location_id && !alloc.location_name) {
        errors.push(`Allocation #${index + 1}: Location must be selected or custom location must be entered`);
      }
      if (!alloc.quantity || parseInt(alloc.quantity) <= 0) {
        errors.push(`Allocation #${index + 1}: Quantity must be greater than 0`);
      }
    });

    return errors;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate allocations
    const validationErrors = validateAllocations();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    // If no allocations, that's valid - means all items stay in current location
    if (allocations.length === 0) {
      // Clear all existing location allocations
      saveAllocationsMutation.mutate([]);
      return;
    }

    // Prepare data for submission - include custom locations
    const submitData = allocations.map(alloc => ({
      location_id: alloc.location_id ? parseInt(alloc.location_id) : null,
      location_name: alloc.location_name,
      quantity: parseInt(alloc.quantity) || 1,
      status: alloc.status,
      notes: alloc.notes
    }));

    saveAllocationsMutation.mutate(submitData);
  };

  if (!isOpen) return null;

  // Use availability data for accurate calculations
  const totalQuantity = equipment?.quantity || 1;
  const totalAvailableForAllocation = getTotalAvailableForLocationAllocation();
  const allocatedQuantity = allocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 0), 0);
  const unallocatedQuantity = totalAvailableForAllocation - allocatedQuantity;
  const validationErrors = validateAllocations();
  const isValid = validationErrors.length === 0;

  // Show loading state while fetching availability data
  const isLoadingData = isLoading || availabilityLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Location Allocations</h2>
              <p className="text-sm text-gray-600 mt-1">
                {equipment?.brand} {equipment?.model} - Total: {totalQuantity} items
                {availabilityData && availabilityData.show_allocated > 0 && (
                  <span className="text-blue-600 ml-2">
                    ({availabilityData.show_allocated} in shows, {totalAvailableForAllocation} available for locations)
                  </span>
                )}
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

          {/* Tab Navigation */}
          <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('allocations')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'allocations'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
              Location Allocations
            </button>
            <button
              onClick={() => setViewMode('installation')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'installation'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Installation Details
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoadingData ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : viewMode === 'allocations' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Visual Allocation Overview */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                <h3 className="text-sm font-medium text-slate-800 mb-3">Allocation Overview</h3>

                {/* Visual Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Items Distribution</span>
                    <span>{allocatedQuantity} / {totalAvailableForAllocation} allocated to locations</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        allocatedQuantity > totalAvailableForAllocation ? 'bg-red-500' :
                        allocatedQuantity === 0 ? 'bg-gray-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((allocatedQuantity / totalAvailableForAllocation) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Allocations Summary */}
                {currentAllocations.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-slate-700 mb-2">Current Distribution:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {currentAllocations.map((alloc, index) => (
                        <div key={index} className="bg-white p-2 rounded border text-xs">
                          <div className="font-medium text-slate-800">{alloc.location_name}</div>
                          <div className="text-slate-600">{alloc.quantity_allocated} items</div>
                        </div>
                      ))}
                      {getUnallocatedQuantity() > 0 && (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs">
                          <div className="font-medium text-blue-800">Default Storage</div>
                          <div className="text-blue-600">{getUnallocatedQuantity()} items</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Summary */}
                <div className={`p-3 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">
                        New Allocation: {allocatedQuantity} / {totalAvailableForAllocation} items
                      </div>
                      {availabilityData && availabilityData.show_allocated > 0 && (
                        <div className="text-blue-600 text-xs mt-1">
                          {availabilityData.show_allocated} items allocated to shows (not available for location allocation)
                        </div>
                      )}
                      {unallocatedQuantity > 0 && (
                        <div className="text-gray-600 mt-1">
                          {unallocatedQuantity} items will remain in default storage
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {allocatedQuantity > totalAvailableForAllocation ? '⚠ Exceeds Available' :
                       allocatedQuantity === 0 ? '✓ All in Default Storage' :
                       '✓ Valid Allocation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Quick Actions */}
              {allocations.length === 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Quick Allocation Options</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Split equally among available locations (max 3)
                        const availableLocations = locations.slice(0, 3);
                        const itemsPerLocation = Math.floor(totalAvailableForAllocation / availableLocations.length);
                        const remainder = totalAvailableForAllocation % availableLocations.length;

                        const newAllocations = availableLocations.map((location, index) => ({
                          id: null,
                          location_id: location.id,
                          location_name: location.name,
                          quantity: itemsPerLocation + (index < remainder ? 1 : 0),
                          status: 'allocated',
                          notes: ''
                        }));
                        setAllocations(newAllocations);
                      }}
                      className="p-3 text-sm bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-800">Split Equally</div>
                      <div className="text-blue-600 text-xs">Distribute across locations</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Move all to first location
                        if (locations.length > 0) {
                          setAllocations([{
                            id: null,
                            location_id: locations[0].id,
                            location_name: locations[0].name,
                            quantity: totalAvailableForAllocation,
                            status: 'allocated',
                            notes: ''
                          }]);
                        }
                      }}
                      className="p-3 text-sm bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-800">Move All</div>
                      <div className="text-blue-600 text-xs">To single location</div>
                    </button>

                    <button
                      type="button"
                      onClick={addAllocation}
                      className="p-3 text-sm bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-800">Custom</div>
                      <div className="text-blue-600 text-xs">Manual allocation</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Allocations List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-medium text-gray-800">
                    Location Allocations
                    {allocations.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">({allocations.length} location{allocations.length !== 1 ? 's' : ''})</span>
                    )}
                  </h3>
                  <div className="flex space-x-2">
                    {allocations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAllocations([])}
                        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors flex items-center"
                        title="Clear all allocations and return all items to default storage"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={addAllocation}
                      className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Location
                    </button>
                  </div>
                </div>

                {allocations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm">No location allocations configured</p>
                    <p className="text-xs text-gray-400 mt-1">All {totalAvailableForAllocation} available items will remain in default storage</p>
                  </div>
                ) : (
                  allocations.map((allocation, index) => {
                    const remainingQuantity = totalAvailableForAllocation - allocations.reduce((sum, alloc, i) =>
                      i !== index ? sum + (parseInt(alloc.quantity) || 0) : sum, 0
                    );
                    const isLocationDuplicate = allocations.some((alloc, i) =>
                      i !== index && alloc.location_id === allocation.location_id && allocation.location_id !== ''
                    );

                    return (
                      <div key={index} className={`p-4 border rounded-lg transition-all ${
                        isLocationDuplicate ? 'border-yellow-300 bg-yellow-50' :
                        allocation.location_id ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        {/* Header with allocation number and status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700">
                              Allocation #{index + 1}
                            </span>
                            {isLocationDuplicate && (
                              <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded-full">
                                Duplicate Location
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Quick quantity buttons */}
                            {allocation.location_id && (
                              <div className="flex space-x-1">
                                {[1, Math.floor(remainingQuantity/2), remainingQuantity].filter((qty, i, arr) =>
                                  qty > 0 && qty <= totalAvailableForAllocation && arr.indexOf(qty) === i
                                ).map(qty => (
                                  <button
                                    key={qty}
                                    type="button"
                                    onClick={() => updateAllocation(index, 'quantity', qty.toString())}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    title={`Set quantity to ${qty}`}
                                  >
                                    {qty}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeAllocation(index)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                              title="Remove allocation"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Location */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                            <select
                              value={allocation.location_id || ''}
                              onChange={(e) => updateAllocation(index, 'location_id', e.target.value)}
                              className={`w-full text-sm rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                                isLocationDuplicate ? 'border-yellow-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Custom Location (enter below)</option>
                              {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={allocation.location_name || ''}
                              onChange={(e) => updateAllocation(index, 'location_name', e.target.value)}
                              placeholder="Enter custom location name"
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-2"
                              disabled={allocation.location_id && allocation.location_id !== ''}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {allocation.location_id && allocation.location_id !== ''
                                ? 'Clear dropdown to use custom location'
                                : 'Used when no predefined location is selected'
                              }
                            </p>
                            {isLocationDuplicate && (
                              <p className="text-xs text-yellow-600 mt-1">This location is already selected</p>
                            )}
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                              <span className="text-gray-500 ml-1">(max: {remainingQuantity})</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={remainingQuantity}
                              value={allocation.quantity}
                              onChange={(e) => updateAllocation(index, 'quantity', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={allocation.status}
                              onChange={(e) => updateAllocation(index, 'status', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                              <option value="allocated">Allocated</option>
                              <option value="in-use">In Use</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="reserved">Reserved</option>
                            </select>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                          <input
                            type="text"
                            value={allocation.notes}
                            onChange={(e) => updateAllocation(index, 'notes', e.target.value)}
                            placeholder="Add notes about this allocation..."
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || saveAllocationsMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saveAllocationsMutation.isLoading ? 'Saving...' : 'Save Allocations'}
                </button>
              </div>
            </form>
          ) : (
            /* Installation Details View */
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Installation Management
                </h3>

                <p className="text-sm text-slate-600 mb-4">
                  Manage permanent and semi-permanent installations for this equipment.
                </p>

                {(equipment?.installation_type === 'fixed' || equipment?.installation_type === 'semi-permanent') ? (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        equipment?.installation_type === 'fixed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {equipment?.installation_type?.charAt(0).toUpperCase() + equipment?.installation_type?.slice(1).replace('-', ' ')} Installation
                      </span>
                      {equipment?.installation_quantity && (
                        <span className="text-sm font-medium text-orange-800 bg-orange-100 px-2 py-1 rounded">
                          {equipment.installation_quantity} items installed
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Installation Location</label>
                        <p className="text-lg font-medium text-slate-800 mt-1">
                          {equipment?.installation_location || 'Location not specified'}
                        </p>
                      </div>

                      {equipment?.installation_date && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Installation Date</label>
                          <p className="text-sm text-slate-600 mt-1">
                            {new Date(equipment.installation_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {equipment?.installation_notes && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Installation Notes</label>
                          <div className="text-sm text-slate-600 bg-white p-3 rounded border mt-1">
                            {equipment.installation_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                    <div className="flex items-center mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Portable Equipment
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      This equipment is portable and not permanently installed at any location.
                    </p>
                  </div>
                )}

                {/* Installation Management Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInstallationModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Manage Installation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Installation Management Modal */}
      <InstallationManagementModal
        isOpen={showInstallationModal}
        onClose={() => setShowInstallationModal(false)}
        equipment={equipment}
        locations={locations}
      />
    </div>
  );
};

export default LocationAllocationManager;
