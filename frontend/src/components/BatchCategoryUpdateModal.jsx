import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories } from '../services/categoryService';
import { updateEquipmentCategory } from '../services/equipmentService';
import Button from './ui/Button';

const BatchCategoryUpdateModal = ({ isOpen, onClose, selectedItems = [] }) => {
  const [categoryId, setCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // Fetch categories for dropdown
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 300000, // 5 minutes
  });

  // Initialize with first category when data is loaded
  useEffect(() => {
    if (categoriesData?.categories && categoriesData.categories.length > 0 && !categoryId) {
      setCategoryId(categoriesData.categories[0].id.toString());
    }
  }, [categoriesData, categoryId]);

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data) => {
      // Create an array of promises to update all equipment items
      const updatePromises = data.equipmentIds.map(id =>
        updateEquipmentCategory(id, data.categoryId)
      );
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      const categoryName = categoriesData?.categories.find(cat => cat.id.toString() === categoryId)?.name || 'selected category';
      setSuccess(`Category successfully updated to ${categoryName} for ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setIsLoading(false);

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      setError(error.response?.data?.message || 'Failed to update category');
      setIsLoading(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError('No equipment items selected');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    updateCategoryMutation.mutate({
      equipmentIds: selectedItems,
      categoryId: categoryId || null // Allow removing category by passing null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Update Equipment Category</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            You are updating the category of {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}.
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
            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
              New Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md"
            >
              <option value="">None (Remove Category)</option>
              {categoriesData?.categories && categoriesData.categories.length > 0 ? (
                categoriesData.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading categories...</option>
              )}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchCategoryUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedItems: PropTypes.array
};

export default BatchCategoryUpdateModal;
