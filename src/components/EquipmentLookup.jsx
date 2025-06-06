import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import BarcodeScanButton from './BarcodeScanButton';

/**
 * A component that allows quick lookup of equipment by serial number
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onEquipmentFound] - Optional callback when equipment is found
 * @returns {JSX.Element} The equipment lookup component
 */
const EquipmentLookup = ({ onEquipmentFound }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Query for equipment lookup
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ['equipmentLookup', serialNumber],
    queryFn: async () => {
      if (!serialNumber) return null;

      const response = await axios.get(`/api/equipment/lookup?serial_number=${encodeURIComponent(serialNumber)}`);
      return response.data;
    },
    enabled: false, // Don't run the query automatically
    retry: false,
    onSuccess: (data) => {
      if (data && data.id) {
        if (onEquipmentFound) {
          // Call the callback with the found equipment data
          onEquipmentFound(data);
          setError('');
        } else {
          // Navigate to the equipment details page if no callback provided
          navigate(`/equipment/${data.id}`);
        }
      } else {
        setError('No equipment found with that serial number');
      }
      setIsSearching(false);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error looking up equipment');
      setIsSearching(false);
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
    handleSearch(scannedValue);
  };

  // Handle search
  const handleSearch = (value = serialNumber) => {
    if (!value) {
      setError('Please enter a serial number');
      return;
    }

    setIsSearching(true);
    refetch();
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Equipment Lookup
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="flex" style={{ display: 'flex', width: '100%' }}>
          <div className="relative" style={{ width: 'calc(100% - 120px)' }}>
            <input
              type="text"
              value={serialNumber}
              onChange={handleInputChange}
              placeholder="Enter serial number"
              className="w-full rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-3 flex items-center"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const barcodeButton = document.getElementById('barcode-scan-button-lookup');
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
              id="barcode-scan-button-lookup"
              onScan={handleScan}
            />
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-2 text-sm text-gray-500">
          Searching...
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Scan a barcode or enter a serial number to quickly find equipment
      </div>
    </div>
  );
};

export default EquipmentLookup;
