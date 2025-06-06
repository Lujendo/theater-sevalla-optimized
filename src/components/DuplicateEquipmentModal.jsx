import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEquipment, getEquipmentById } from '../services/equipmentService';

const DuplicateEquipmentModal = ({ isOpen, onClose, equipmentId }) => {
  const queryClient = useQueryClient();
  const [serialNumber, setSerialNumber] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch the original equipment data
  useEffect(() => {
    if (isOpen && equipmentId) {
      setIsLoading(true);
      getEquipmentById(equipmentId)
        .then(data => {
          setOriginalData(data);
          // Suggest a new serial number based on the original
          setSerialNumber(`${data.serial_number}-COPY`);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching equipment details:', err);
          setError('Failed to load equipment details');
          setIsLoading(false);
        });
    }
  }, [isOpen, equipmentId]);

  // Create duplicate equipment mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!originalData) return null;

      // Log the original data to debug
      console.log('Original equipment data:', originalData);

      // Create a copy of the original data with the new serial number
      const duplicateData = {
        type_id: originalData.type_id || 1, // Ensure type_id is provided (default to 1 if missing)
        brand: originalData.brand,
        model: originalData.model,
        serial_number: serialNumber,
        status: originalData.status || 'available',
        location: originalData.location || '',
        description: originalData.description || ''
      };

      console.log('Duplicate data being sent:', duplicateData);

      return createEquipment(duplicateData);
    },
    onSuccess: (data) => {
      console.log('Successfully duplicated equipment:', data);
      queryClient.invalidateQueries(['equipment']);
      onClose();
    },
    onError: (error) => {
      console.error('Error duplicating equipment:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to duplicate equipment. Please check all required fields.');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setError('Serial number is required');
      return;
    }
    duplicateMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Duplicate Equipment</h2>

        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : error ? (
          <div className="text-red-600 mb-4">{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                You are about to duplicate: <span className="font-medium">{originalData?.brand} {originalData?.model}</span>
              </p>

              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-1">
                Please provide a unique serial number for the duplicated equipment.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-slate-600
                  hover:bg-slate-50 border border-slate-300 hover:border-slate-400
                  hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-primary-600
                  hover:bg-primary-50 border border-primary-500 hover:border-primary-600
                  hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary-500"
                disabled={duplicateMutation.isLoading}
              >
                {duplicateMutation.isLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DuplicateEquipmentModal;
