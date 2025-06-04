import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, createEquipment } from '../services/equipmentService';
import { Button } from './ui';

const BatchDuplicateModal = ({ isOpen, onClose, equipmentId, selectedItems = [] }) => {
  // Use selectedItems if provided, otherwise use single equipmentId
  const equipmentIds = selectedItems.length > 0 ? selectedItems : (equipmentId ? [equipmentId] : []);
  const queryClient = useQueryClient();
  const [count, setCount] = useState(2);
  const [serialNumberPattern, setSerialNumberPattern] = useState('');
  const [serialNumberPreview, setSerialNumberPreview] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch the original equipment data
  useEffect(() => {
    if (isOpen && equipmentIds.length > 0) {
      setIsLoading(true);
      setOriginalData([]);

      // Create an array of promises to fetch all equipment data
      const fetchPromises = equipmentIds.map(id => getEquipmentById(id));

      Promise.all(fetchPromises)
        .then(dataArray => {
          setOriginalData(dataArray);

          // If there's only one item, suggest a serial number pattern
          if (dataArray.length === 1) {
            const pattern = `${dataArray[0].serial_number}-{n}`;
            setSerialNumberPattern(pattern);
          } else {
            // For multiple items, use a more generic pattern
            setSerialNumberPattern('BATCH-{n}');
          }

          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching equipment details:', err);
          setError('Failed to load equipment details');
          setIsLoading(false);
        });
    }
  }, [isOpen, equipmentIds]);

  // Generate serial number preview
  useEffect(() => {
    if (serialNumberPattern && count > 0) {
      const preview = [];
      for (let i = 1; i <= Math.min(count, 5); i++) {
        preview.push(generateSerialNumber(serialNumberPattern, i));
      }

      if (count > 5) {
        preview.push('...');
        preview.push(generateSerialNumber(serialNumberPattern, count));
      }

      setSerialNumberPreview(preview);
    }
  }, [serialNumberPattern, count]);

  // Generate a serial number based on the pattern and index
  const generateSerialNumber = (pattern, index) => {
    return pattern.replace('{n}', index);
  };

  // Create duplicate equipment mutation
  const duplicateMutation = useMutation({
    mutationFn: async ({ equipmentData, serialNumber }) => {
      if (!equipmentData) return null;

      // Create a copy of the original data with the new serial number
      const duplicateData = {
        type: equipmentData.type,
        type_id: equipmentData.type_id || 1,
        category: equipmentData.category || '',
        // Handle category_id properly - ensure it's null not 'null' string
        ...(equipmentData.category_id ? { category_id: equipmentData.category_id } : {}),
        brand: equipmentData.brand,
        model: equipmentData.model,
        serial_number: serialNumber,
        status: equipmentData.status || 'available',
        location: equipmentData.location || '',
        // Handle location_id properly
        ...(equipmentData.location_id ? { location_id: equipmentData.location_id } : {}),
        description: equipmentData.description || '',
        // Handle reference_image_id properly
        ...(equipmentData.reference_image_id ? { reference_image_id: equipmentData.reference_image_id } : {})
      };

      return createEquipment(duplicateData);
    }
  });

  // Handle batch duplication
  const handleBatchDuplicate = async () => {
    if (originalData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Calculate total operations (number of items × number of copies)
      const totalOperations = originalData.length * count;
      let completedOperations = 0;

      // For each original equipment item
      for (const equipmentData of originalData) {
        // Create the specified number of copies
        for (let i = 1; i <= count; i++) {
          // Generate a unique serial number for each copy
          let serialNumber;
          if (originalData.length === 1) {
            // For single item, use the pattern directly
            serialNumber = generateSerialNumber(serialNumberPattern, i);
          } else {
            // For multiple items, make the serial number unique per item
            serialNumber = generateSerialNumber(
              serialNumberPattern.replace('{n}', `${equipmentData.id}-{n}`),
              i
            );
          }

          // Log the data being duplicated for debugging
          console.log(`Creating duplicate ${i} for equipment ID ${equipmentData.id} with serial number ${serialNumber}`);
          console.log('Original equipment data:', JSON.stringify(equipmentData, null, 2));

          // Create the duplicate
          try {
            await duplicateMutation.mutateAsync({
              equipmentData,
              serialNumber
            });
            console.log(`Successfully created duplicate ${i} for equipment ID ${equipmentData.id}`);
          } catch (error) {
            console.error(`Error creating duplicate ${i} for equipment ID ${equipmentData.id}:`, error);
            throw error; // Re-throw to be caught by the outer try/catch
          }

          // Update progress
          completedOperations++;
          setProgress(Math.floor((completedOperations / totalOperations) * 100));
        }
      }

      // Refresh equipment list
      queryClient.invalidateQueries(['equipment']);
      onClose();
    } catch (error) {
      console.error('Error in batch duplication:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to duplicate equipment';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Batch Duplicate Equipment</h2>

        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : error ? (
          <div className="text-red-600 mb-4">{error}</div>
        ) : (
          <div>
            <div className="text-gray-600 mb-4">
              <p>You are about to duplicate {originalData.length} item{originalData.length !== 1 ? 's' : ''}:</p>
              {originalData.length === 1 ? (
                <p className="font-medium mt-1">{originalData[0]?.brand} {originalData[0]?.model} (SN: {originalData[0]?.serial_number})</p>
              ) : (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  <ul className="text-sm">
                    {originalData.map((item, index) => (
                      <li key={index} className="mb-1">
                        {item.brand} {item.model} (SN: {item.serial_number})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Copies
              </label>
              <input
                type="number"
                id="count"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="serialNumberPattern" className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number Pattern
              </label>
              <input
                type="text"
                id="serialNumberPattern"
                value={serialNumberPattern}
                onChange={(e) => setSerialNumberPattern(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Use {n} for the copy number"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use {'{n}'} as a placeholder for the copy number.
              </p>
            </div>

            {serialNumberPreview.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number Preview
                </label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <ul className="text-sm text-gray-600">
                    {serialNumberPreview.map((serial, index) => (
                      <li key={index}>{serial}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1 text-center">
                  {progress}% Complete
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBatchDuplicate}
                disabled={isProcessing || !serialNumberPattern.includes('{n}')}
              >
                {isProcessing ? 'Processing...' : 'Create Copies'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchDuplicateModal;
