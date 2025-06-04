import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getEquipmentTypes, 
  createEquipmentType, 
  updateEquipmentType, 
  deleteEquipmentType 
} from '../services/equipmentTypeService';
import { useAuth } from '../context/AuthContext';

const EquipmentTypeManager = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [error, setError] = useState('');

  // Fetch equipment types
  const { data: types, isLoading, isError } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: getEquipmentTypes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createEquipmentType,
    onSuccess: () => {
      queryClient.invalidateQueries(['equipmentTypes']);
      setNewTypeName('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to create equipment type');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => updateEquipmentType(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipmentTypes']);
      setEditingType(null);
      setEditedName('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to update equipment type');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEquipmentType,
    onSuccess: () => {
      queryClient.invalidateQueries(['equipmentTypes']);
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to delete equipment type');
    }
  });

  // Handle form submission for new type
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      setError('Type name is required');
      return;
    }
    createMutation.mutate(newTypeName);
  };

  // Start editing a type
  const handleEdit = (type) => {
    setEditingType(type);
    setEditedName(type.name);
  };

  // Save edited type
  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      setError('Type name is required');
      return;
    }
    updateMutation.mutate({ id: editingType.id, name: editedName });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingType(null);
    setEditedName('');
  };

  // Delete a type
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this equipment type?')) {
      deleteMutation.mutate(id);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p>Only administrators can manage equipment types.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Manage Equipment Types</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Add new type form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="New equipment type"
            className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mr-2"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? 'Adding...' : 'Add Type'}
          </button>
        </div>
      </form>
      
      {/* Types list */}
      {isLoading ? (
        <p>Loading equipment types...</p>
      ) : isError ? (
        <p className="text-red-500">Error loading equipment types</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {types && types.length > 0 ? (
            types.map((type) => (
              <li key={type.id} className="py-3">
                {editingType && editingType.id === type.id ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mr-2"
                      required
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 mr-1"
                      disabled={updateMutation.isLoading}
                    >
                      {updateMutation.isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800">{type.name}</span>
                    <div>
                      <button
                        onClick={() => handleEdit(type)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={deleteMutation.isLoading}
                      >
                        {deleteMutation.isLoading && deleteMutation.variables === type.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            <p className="text-gray-500">No equipment types found. Add some types above.</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default EquipmentTypeManager;
