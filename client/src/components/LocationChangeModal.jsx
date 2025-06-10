import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Input, Select } from './ui';

const LocationChangeModal = ({ isOpen, onClose, equipment, onSubmit }) => {
  const [formData, setFormData] = useState({
    location_id: '',
    location: '',
    status: ''
  });
  const [error, setError] = useState('');

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

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && equipment) {
      setFormData({
        location_id: equipment.location_id ? equipment.location_id.toString() : '',
        location: equipment.location || '',
        status: equipment.status || 'available'
      });
      setError('');
    }
  }, [isOpen, equipment]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };

    // Special handling for location_id
    if (name === 'location_id' && value) {
      const locationsArray = Array.isArray(locations) ? locations : [];
      const selectedLocation = locationsArray.find(loc => loc.id.toString() === value);

      if (selectedLocation) {
        updatedFormData = {
          ...updatedFormData,
          location_id: value,
          location: selectedLocation.name
        };

        // Check if the location is "Lager" (case insensitive)
        const isLager = selectedLocation.name.toLowerCase() === 'lager';

        // Update status based on location
        if (isLager) {
          updatedFormData.status = 'available';
        } else if (updatedFormData.status === 'available') {
          updatedFormData.status = 'in-use';
        }
      }
    }
    // Special handling for custom location
    else if (name === 'location' && value) {
      updatedFormData = {
        ...updatedFormData,
        location: value,
        location_id: '' // Clear location_id when custom location is entered
      };

      // Check if the location is "Lager" (case insensitive)
      const isLager = value.toLowerCase() === 'lager';

      // Update status based on location
      if (isLager) {
        updatedFormData.status = 'available';
      } else if (updatedFormData.status === 'available') {
        updatedFormData.status = 'in-use';
      }
    }

    setFormData(updatedFormData);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate that either location_id or location is provided
    if (!formData.location_id && !formData.location) {
      setError('Please select a location or enter a custom location');
      return;
    }

    // Prepare data for submission - PRESERVE ORIGINAL QUANTITY
    const submitData = {
      location_id: formData.location_id ? parseInt(formData.location_id) : null,
      location: formData.location,
      status: formData.status,
      quantity: equipment.quantity || 1 // Preserve the original quantity, default to 1 if not set
    };

    onSubmit(submitData);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      location_id: '',
      location: '',
      status: 'available'
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const locationsArray = Array.isArray(locations) ? locations : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Change Storage Location</h2>
              <p className="text-sm text-slate-600">
                {equipment?.brand} {equipment?.model} • {equipment?.serial_number}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Quantity: {equipment?.quantity || 1} items (will be preserved)
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Dropdown */}
            <div>
              <Select
                id="location_id"
                name="location_id"
                label="Select Location"
                value={formData.location_id}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Location' },
                  ...locationsArray.map((location) => {
                    let label = location.name;
                    const addressParts = [];

                    if (location.city) addressParts.push(location.city);
                    if (location.region) addressParts.push(location.region);
                    if (location.country) addressParts.push(location.country);

                    if (addressParts.length > 0) {
                      label += ` (${addressParts.join(', ')})`;
                    }

                    return {
                      value: location.id.toString(),
                      label: label,
                    };
                  })
                ]}
                disabled={locationsLoading}
              />
            </div>

            {/* Custom Location Input */}
            <div>
              <Input
                id="location"
                name="location"
                label="Custom Location (if not in list)"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter custom location"
                helpText="Use this if location is not in the dropdown"
              />
            </div>

            {/* Status Display */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status (Auto-updated)
              </label>
              <div className="p-3 bg-slate-50 rounded-md">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  formData.status === 'available' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {formData.status.charAt(0).toUpperCase() + formData.status.slice(1).replace('-', ' ')}
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  {formData.location?.toLowerCase() === 'lager' || locationsArray.find(loc => loc.id.toString() === formData.location_id)?.name?.toLowerCase() === 'lager'
                    ? 'Status set to "Available" because location is Lager'
                    : 'Status set to "In Use" for non-Lager locations'
                  }
                </p>
              </div>
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
              >
                Update Location
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocationChangeModal;
