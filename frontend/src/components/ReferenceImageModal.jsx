import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEquipment } from '../services/equipmentService';
import ReferenceImageUpload from './ReferenceImageUpload';
import { Button } from './ui';

const ReferenceImageModal = ({
  isOpen,
  onClose,
  equipmentId,
  existingImage = null
}) => {
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Handle reference image selection
  const handleReferenceImageSelect = (file) => {
    setReferenceImageFile(file);
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Don't send reference_image_id at all, let the server handle it
      return updateEquipment(
        equipmentId,
        {}, // Empty object - don't set reference_image_id
        [],
        [],
        data.referenceImageFile,
        data.removeReferenceImage
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment', equipmentId]);
      onClose();
    },
    onError: (error) => {
      console.error('Error updating reference image:', error);
      setError(error.response?.data?.message || 'Failed to update reference image');
      setIsLoading(false);
    },
  });

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!referenceImageFile) {
      setError('Please select an image file');
      return;
    }

    setIsLoading(true);
    setError('');

    updateMutation.mutate({
      referenceImageFile: referenceImageFile,
    });
  };

  // Handle removing the reference image
  const handleRemoveReferenceImage = () => {
    setIsLoading(true);
    setError('');

    updateMutation.mutate({
      referenceImageFile: null,
      removeReferenceImage: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-slate-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Reference Image
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  This image will be displayed prominently on the equipment details page and in search results.
                </p>
                <div className="mt-4">
                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <ReferenceImageUpload
                        onImageSelect={handleReferenceImageSelect}
                        existingImage={existingImage}
                      />
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading || !referenceImageFile}
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="mt-3 w-full sm:mt-0 sm:w-auto"
                      >
                        Cancel
                      </Button>
                      {existingImage && (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={handleRemoveReferenceImage}
                          className="mt-3 w-full sm:mt-0 sm:mr-auto sm:w-auto"
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReferenceImageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  equipmentId: PropTypes.string.isRequired,
  existingImage: PropTypes.object,
};

export default ReferenceImageModal;
