import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEquipment } from '../services/equipmentService';
import BarcodeScanButton from './BarcodeScanButton';

/**
 * A component that allows quick creation of equipment by scanning a barcode
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onEquipmentCreated] - Optional callback when equipment is created
 * @returns {JSX.Element} The barcode card creator component
 */
const BarcodeCardCreator = ({ onEquipmentCreated }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return createEquipment(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['equipment']);
      setSerialNumber('');
      setError('');
      setIsCreating(false);

      if (onEquipmentCreated) {
        onEquipmentCreated(data);
      }
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to create equipment');
      setIsCreating(false);
    }
  });

  // Handle input change
  const handleInputChange = (e) => {
    setSerialNumber(e.target.value);
    setError('');
  };

  // Handle barcode scan
  const handleScan = (scannedValue) => {
    setSerialNumber(scannedValue);
    setError('');
  };

  // Handle quick create
  const handleQuickCreate = () => {
    if (!serialNumber) {
      setError('Please enter or scan a serial number');
      return;
    }

    setIsCreating(true);

    // Create basic equipment with just the serial number
    // Other fields will be filled in later by editing
    const equipmentData = {
      equipment: {
        type: 'other', // Default type
        brand: 'Unknown', // Default brand
        model: 'Unknown', // Default model
        serial_number: serialNumber,
        status: 'available', // Default status
        location: 'Lager', // Default location
        description: 'Created via quick scan', // Default description
      },
      files: [] // No files initially
    };

    createMutation.mutate(equipmentData);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Quick Create Equipment
      </h2>

      <div className="mb-3">
        <label htmlFor="quick_serial_number" className="block text-sm font-medium text-gray-700 mb-1">
          Serial Number
        </label>
        <div className="flex" style={{ display: 'flex', width: '100%' }}>
          <input
            type="text"
            id="quick_serial_number"
            value={serialNumber}
            onChange={handleInputChange}
            placeholder="Enter or scan serial number"
            style={{ width: 'calc(100% - 120px)' }}
            className="rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => {
              const barcodeButton = document.getElementById('barcode-scan-button-quick');
              if (barcodeButton) barcodeButton.click();
            }}
            style={{
              width: '120px',
              backgroundColor: '#4F46E5',
              color: 'white',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopRightRadius: '0.375rem',
              borderBottomRightRadius: '0.375rem',
              borderLeft: 'none'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Scan
          </button>
          <div style={{ display: 'none' }}>
            <BarcodeScanButton
              id="barcode-scan-button-quick"
              onScan={handleScan}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleQuickCreate}
        disabled={isCreating || !serialNumber}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isCreating ? 'Creating...' : 'Create Equipment'}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Scan a barcode or enter a serial number to quickly create basic equipment. You can edit additional details later.
      </div>
    </div>
  );
};

export default BarcodeCardCreator;
