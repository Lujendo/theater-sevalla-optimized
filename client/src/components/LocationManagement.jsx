import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../services/locationService';
import { Card, Button, Input } from './ui';
import { useAuth } from '../context/AuthContext';

const LocationManagement = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    postal_code: '',
    city: '',
    region: '',
    country: ''
  });

  // Fetch locations
  const { data, isLoading, isError } = useQuery(['locations'], getLocations);

  // Create location mutation
  const createMutation = useMutation(createLocation, {
    onSuccess: () => {
      queryClient.invalidateQueries(['locations']);
      setIsAddModalOpen(false);
      setFormData({ name: '', street: '', postal_code: '', city: '', region: '', country: '' });
      alert('Location created successfully');
    },
    onError: (error) => {
      alert(`Error creating location: ${error.response?.data?.message || error.message}`);
    }
  });

  // Update location mutation
  const updateMutation = useMutation(
    (data) => updateLocation(data.id, data.locationData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations']);
        setIsEditModalOpen(false);
        setSelectedLocation(null);
        alert('Location updated successfully');
      },
      onError: (error) => {
        alert(`Error updating location: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete location mutation
  const deleteMutation = useMutation(deleteLocation, {
    onSuccess: () => {
      queryClient.invalidateQueries(['locations']);
      setIsDeleteModalOpen(false);
      setSelectedLocation(null);
      alert('Location deleted successfully');
    },
    onError: (error) => {
      alert(`Error deleting location: ${error.response?.data?.message || error.message}`);
    }
  });

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle add location
  const handleAddLocation = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Handle edit location
  const handleEditLocation = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: selectedLocation.id,
      locationData: formData
    });
  };

  // Handle delete location
  const handleDeleteLocation = () => {
    deleteMutation.mutate(selectedLocation.id);
  };

  // Open edit modal
  const openEditModal = (location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      street: location.street || '',
      postal_code: location.postal_code || '',
      city: location.city || '',
      region: location.region || '',
      country: location.country || ''
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (location) => {
    setSelectedLocation(location);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading locations...</div>;
  }

  if (isError) {
    return <div className="text-center py-4 text-red-600">Error loading locations</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Locations</h2>
        {isAdmin() && (
          <Button
            variant="primary"
            onClick={() => {
              setFormData({ name: '', street: '', postal_code: '', city: '', region: '', country: '' });
              setIsAddModalOpen(true);
            }}
          >
            Add Location
          </Button>
        )}
      </div>

      {/* Locations List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Street</th>
                <th className="table-header-cell">Postal Code</th>
                <th className="table-header-cell">City</th>
                <th className="table-header-cell">Region</th>
                <th className="table-header-cell">Country</th>
                {isAdmin() && <th className="table-header-cell">Actions</th>}
              </tr>
            </thead>
            <tbody className="table-body">
              {data?.locations?.length > 0 ? (
                data.locations.map((location) => (
                  <tr key={location.id} className="table-row">
                    <td className="table-cell">{location.name}</td>
                    <td className="table-cell">{location.street || '-'}</td>
                    <td className="table-cell">{location.postal_code || '-'}</td>
                    <td className="table-cell">{location.city || '-'}</td>
                    <td className="table-cell">{location.region || '-'}</td>
                    <td className="table-cell">{location.country || '-'}</td>
                    {isAdmin() && (
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(location)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openDeleteModal(location)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin() ? 7 : 6} className="table-cell text-center py-4 text-slate-500">
                    No locations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Location Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Location</h3>
              <button
                className="modal-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddLocation}>
              <div className="modal-body">
                <div className="space-y-4">
                  <Input
                    id="name"
                    name="name"
                    label="Location Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter location name"
                    required
                  />
                  <Input
                    id="street"
                    name="street"
                    label="Street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Enter street (optional)"
                  />
                  <Input
                    id="postal_code"
                    name="postal_code"
                    label="Postal Code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="Enter postal code (optional)"
                  />
                  <Input
                    id="city"
                    name="city"
                    label="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city (optional)"
                  />
                  <Input
                    id="region"
                    name="region"
                    label="Region/State"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Enter region or state (optional)"
                  />
                  <Input
                    id="country"
                    name="country"
                    label="Country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter country (optional)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMutation.isLoading}
                >
                  {createMutation.isLoading ? 'Adding...' : 'Add Location'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {isEditModalOpen && selectedLocation && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Location</h3>
              <button
                className="modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditLocation}>
              <div className="modal-body">
                <div className="space-y-4">
                  <Input
                    id="edit-name"
                    name="name"
                    label="Location Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter location name"
                    required
                  />
                  <Input
                    id="edit-street"
                    name="street"
                    label="Street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Enter street (optional)"
                  />
                  <Input
                    id="edit-postal_code"
                    name="postal_code"
                    label="Postal Code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="Enter postal code (optional)"
                  />
                  <Input
                    id="edit-city"
                    name="city"
                    label="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city (optional)"
                  />
                  <Input
                    id="edit-region"
                    name="region"
                    label="Region/State"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Enter region or state (optional)"
                  />
                  <Input
                    id="edit-country"
                    name="country"
                    label="Country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter country (optional)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Location Modal */}
      {isDeleteModalOpen && selectedLocation && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Delete Location</h3>
              <button
                className="modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the location "{selectedLocation.name}"?
                This action cannot be undone.
              </p>
              <p className="text-sm text-red-600 mt-2">
                Note: You cannot delete a location that is currently assigned to equipment.
              </p>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteLocation}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? 'Deleting...' : 'Delete Location'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManagement;
