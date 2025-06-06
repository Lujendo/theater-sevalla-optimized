import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEquipmentTypes,
  createEquipmentType,
  updateEquipmentType,
  deleteEquipmentType
} from '../services/equipmentTypeService';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui';

// Icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
  </svg>
);

const CancelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const EquipmentTypeManagerModern = () => {
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
    // Close the modal
    document.getElementById('addTypeModal').style.display = 'none';
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
      <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
        <p>Only administrators can manage equipment types.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Equipment Types</h2>
        <Button
          variant="primary"
          onClick={() => {
            setNewTypeName('');
            document.getElementById('addTypeModal').style.display = 'block';
          }}
          className="flex items-center gap-2"
        >
          <AddIcon />
          Add Type
        </Button>
      </div>

      {/* Types list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {isLoading ? (
                <tr>
                  <td colSpan="2" className="table-cell text-center py-4">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="2" className="table-cell text-center py-4 text-red-600">
                    Error loading equipment types. Please try again.
                  </td>
                </tr>
              ) : types && types.length > 0 ? (
                types.map((type) => (
                  <tr key={type.id} className="table-row">
                    <td className="table-cell">{type.name}</td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleEdit(type)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <EditIcon />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(type.id)}
                          variant="danger"
                          size="sm"
                          disabled={deleteMutation.isLoading && deleteMutation.variables === type.id}
                          className="flex items-center gap-1"
                        >
                          <DeleteIcon />
                          {deleteMutation.isLoading && deleteMutation.variables === type.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="table-cell text-center py-4 text-slate-500">
                    No equipment types found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Type Modal */}
      <div className="modal-backdrop" id="addTypeModal" style={{ display: 'none' }}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">Add Equipment Type</h3>
            <button
              className="modal-close"
              onClick={() => document.getElementById('addTypeModal').style.display = 'none'}
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="space-y-4">
                <Input
                  id="newTypeName"
                  name="newTypeName"
                  type="text"
                  label="Type Name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Enter equipment type name"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('addTypeModal').style.display = 'none'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isLoading}
                className="flex items-center gap-2"
              >
                {createMutation.isLoading ? 'Adding...' : 'Add Type'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Type Modal */}
      {editingType && (
        <div className="modal-backdrop" style={{ display: 'block' }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Equipment Type</h3>
              <button
                className="modal-close"
                onClick={handleCancelEdit}
              >
                &times;
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="modal-body">
                <div className="space-y-4">
                  <Input
                    id="editTypeName"
                    name="editTypeName"
                    type="text"
                    label="Type Name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updateMutation.isLoading}
                  className="flex items-center gap-2"
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentTypeManagerModern;
