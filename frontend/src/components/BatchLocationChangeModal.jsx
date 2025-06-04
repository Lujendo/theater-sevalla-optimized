import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateEquipmentLocation } from '../services/equipmentService';
import { getLocations } from '../services/locationService';

const BatchLocationChangeModal = ({ isOpen, onClose, equipmentId, selectedItems = [] }) => {
  // Use selectedItems if provided, otherwise use single equipmentId
  const equipmentIds = selectedItems.length > 0 ? selectedItems : (equipmentId ? [equipmentId] : []);
  const [locationId, setLocationId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000, // 5 minutes
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data) => {
      // Create an array of promises to update all equipment items
      const updatePromises = data.equipmentIds.map(id =>
        updateEquipmentLocation(id, data.locationData)
      );
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      const locationName = useCustomLocation
        ? customLocation
        : locationsData?.locations.find(loc => loc.id.toString() === locationId)?.name || 'selected location';

      setSuccess(`Location successfully updated to ${locationName} for ${equipmentIds.length} item${equipmentIds.length !== 1 ? 's' : ''}`);
      setIsLoading(false);

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error updating location:', error);
      setError(error.response?.data?.message || 'Failed to update location');
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

    const locationData = useCustomLocation
      ? { location: customLocation }
      : { location_id: locationId };

    updateLocationMutation.mutate({
      equipmentIds,
      locationData
    });
  };

  const toggleLocationMode = () => {
    setUseCustomLocation(!useCustomLocation);
    // Reset values when switching modes
    setLocationId('');
    setCustomLocation('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Update Equipment Location</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            You are updating the location of {equipmentIds.length} item{equipmentIds.length !== 1 ? 's' : ''}.
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
            <div className="flex items-center mb-3">
              <button
                type="button"
                onClick={toggleLocationMode}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                {useCustomLocation ? 'Select from existing locations' : 'Enter custom location'}
              </button>
            </div>

            {useCustomLocation ? (
              <div>
                <label htmlFor="customLocation" className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Location
                </label>
                <input
                  type="text"
                  id="customLocation"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder="Enter location name"
                  required
                />
              </div>
            ) : (
              <div>
                <label htmlFor="locationId" className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <select
                  id="locationId"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  required
                >
                  <option value="">Select a location</option>
                  {locationsData?.locations?.map((location) => (
                    <option key={location.id} value={location.id.toString()}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              disabled={isLoading || (!locationId && !customLocation)}
            >
              {isLoading ? 'Updating...' : 'Update Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchLocationChangeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  equipmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedItems: PropTypes.array,
};

export default BatchLocationChangeModal;
