import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../services/categoryService';
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

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h1v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
  </svg>
);

const CancelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const CategoryManagerModern = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [error, setError] = useState('');

  // Fetch categories
  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: ({ name, description }) => createCategory(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to create category');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name, description }) => updateCategory(id, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setEditingCategory(null);
      setEditedName('');
      setEditedDescription('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to update category');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to delete category');
    }
  });

  // Handle form submission for new category
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }
    createMutation.mutate({
      name: newCategoryName,
      description: newCategoryDescription
    });
    // Close the modal
    document.getElementById('addCategoryModal').style.display = 'none';
  };

  // Start editing a category
  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditedName(category.name);
    setEditedDescription(category.description || '');
  };

  // Save edited category
  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      setError('Category name is required');
      return;
    }
    updateMutation.mutate({
      id: editingCategory.id,
      name: editedName,
      description: editedDescription
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditedName('');
    setEditedDescription('');
  };

  // Delete a category
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p>Only administrators can manage equipment categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Equipment Categories</h2>
        <Button
          variant="primary"
          onClick={() => {
            setNewCategoryName('');
            setNewCategoryDescription('');
            document.getElementById('addCategoryModal').style.display = 'block';
          }}
          className="flex items-center gap-2"
        >
          <AddIcon />
          Add Category
        </Button>
      </div>

      {/* Categories list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {isLoading ? (
                <tr>
                  <td colSpan="3" className="table-cell text-center py-4">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="3" className="table-cell text-center py-4 text-red-600">
                    Error loading categories. Please try again.
                  </td>
                </tr>
              ) : categories && categories.length > 0 ? (
                categories.map((category) => (
                  <tr key={category.id} className="table-row">
                    <td className="table-cell">{category.name}</td>
                    <td className="table-cell">{category.description || '-'}</td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleEdit(category)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <EditIcon />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
                          variant="danger"
                          size="sm"
                          disabled={deleteMutation.isLoading && deleteMutation.variables === category.id}
                          className="flex items-center gap-1"
                        >
                          <DeleteIcon />
                          {deleteMutation.isLoading && deleteMutation.variables === category.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="table-cell text-center py-4 text-slate-500">
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Category Modal */}
      <div className="modal-backdrop" id="addCategoryModal" style={{ display: 'none' }}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">Add Category</h3>
            <button
              className="modal-close"
              onClick={() => document.getElementById('addCategoryModal').style.display = 'none'}
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="space-y-4">
                <Input
                  id="newCategoryName"
                  name="newCategoryName"
                  type="text"
                  label="Category Name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  required
                />
                <Input
                  id="newCategoryDescription"
                  name="newCategoryDescription"
                  type="text"
                  label="Description (optional)"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Enter category description"
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('addCategoryModal').style.display = 'none'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isLoading}
                className="flex items-center gap-2"
              >
                {createMutation.isLoading ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="modal-backdrop" style={{ display: 'block' }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Category</h3>
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
                    id="editCategoryName"
                    name="editCategoryName"
                    type="text"
                    label="Category Name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    required
                  />
                  <Input
                    id="editCategoryDescription"
                    name="editCategoryDescription"
                    type="text"
                    label="Description (optional)"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Enter category description"
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

export default CategoryManagerModern;
