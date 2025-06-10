import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiStar, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const DefaultStorageLocations = () => {
  const [defaultStorageLocations, setDefaultStorageLocations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    location_id: '',
    name: '',
    description: '',
    is_active: true,
    priority: 1
  });

  useEffect(() => {
    fetchDefaultStorageLocations();
    fetchLocations();
  }, []);

  const fetchDefaultStorageLocations = async () => {
    try {
      const response = await axios.get('/api/default-storage-locations');
      setDefaultStorageLocations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching default storage locations:', error);
      setDefaultStorageLocations([]); // Ensure it's always an array
      toast.error('Failed to load default storage locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations');

      // Extract locations array from response
      const locationsData = response.data.locations || response.data;
      const locationsArray = Array.isArray(locationsData) ? locationsData : [];

      setLocations(locationsArray);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]); // Ensure locations is always an array
      toast.error('Failed to load locations');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.location_id || !formData.name) {
      toast.error('Location and name are required');
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`/api/default-storage-locations/${editingItem.id}`, formData);
        toast.success('Default storage location updated!');
      } else {
        await axios.post('/api/default-storage-locations', formData);
        toast.success('Default storage location created!');
      }

      fetchDefaultStorageLocations();
      resetForm();
    } catch (error) {
      console.error('Error saving default storage location:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save default storage location';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      location_id: item.location_id,
      name: item.name,
      description: item.description || '',
      is_active: item.is_active,
      priority: item.priority
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this default storage location?')) {
      return;
    }

    try {
      await axios.delete(`/api/default-storage-locations/${id}`);
      toast.success('Default storage location deleted!');
      fetchDefaultStorageLocations();
    } catch (error) {
      console.error('Error deleting default storage location:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete default storage location';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      location_id: '',
      name: '',
      description: '',
      is_active: true,
      priority: 1
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const getLocationName = (locationId) => {
    if (!Array.isArray(locations)) {
      return 'Unknown Location';
    }
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const getAvailableLocations = () => {
    // Ensure both arrays exist before filtering
    if (!Array.isArray(locations) || !Array.isArray(defaultStorageLocations)) {
      return [];
    }

    const usedLocationIds = defaultStorageLocations
      .filter(dsl => editingItem ? dsl.id !== editingItem.id : true)
      .map(dsl => dsl.location_id);

    return locations.filter(loc => !usedLocationIds.includes(loc.id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Default Storage Locations</h2>
          <p className="text-gray-600 mt-1">
            Configure which locations are considered "main storage" for inventory calculations
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Add Storage Location
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit Default Storage Location' : 'Add Default Storage Location'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a location</option>
                  {getAvailableLocations().map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Main Storage"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers = higher priority</p>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Optional description..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                {editingItem ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Storage Locations List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Configured Storage Locations</h3>
        </div>
        
        {defaultStorageLocations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiMapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No default storage locations configured</p>
            <p className="text-sm">Add a storage location to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {defaultStorageLocations.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <FiStar className={`w-4 h-4 ${item.priority === 1 ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <span className="text-xs text-gray-500">Priority {item.priority}</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900">{item.name}</h4>
                      {!item.is_active && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">
                      Location: {getLocationName(item.location_id)}
                    </p>
                    {item.description && (
                      <p className="text-gray-500 text-sm mt-1">{item.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How Default Storage Locations Work</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Only items in these locations count as "Available in Storage"</li>
          <li>• Items in other locations show their actual current location</li>
          <li>• This eliminates confusion between current location vs. available inventory</li>
          <li>• Priority determines the order for inventory calculations (1 = highest)</li>
        </ul>
      </div>
    </div>
  );
};

export default DefaultStorageLocations;
