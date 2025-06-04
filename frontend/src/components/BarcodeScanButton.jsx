import React, { useState } from 'react';
import PropTypes from 'prop-types';
import BarcodeScanner from './BarcodeScanner';
import { toast } from 'react-toastify';

/**
 * A button component that opens a barcode scanner when clicked
 *
 * @param {Object} props - Component props
 * @param {Function} props.onScan - Callback function when a barcode is successfully scanned
 * @param {string} props.buttonText - Text to display on the button
 * @param {string} props.className - Additional CSS classes for the button
 * @returns {JSX.Element} The barcode scan button component
 */
const BarcodeScanButton = ({ id = '', onScan, buttonText = '', className = '' }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Handle scanner open
  const handleOpenScanner = () => {
    setIsScannerOpen(true);
  };

  // Handle scanner close
  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  // Handle scan error
  const handleScanError = (error) => {
    console.error('Scan error:', error);
    // You could add a toast notification here
  };

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={handleOpenScanner}
        className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md
          bg-white text-primary-600 hover:bg-primary-50 border border-primary-500
          hover:border-primary-600 hover:shadow-sm transition-all ${className}`}
        title="Scan Barcode"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
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
        {buttonText && <span className="ml-1 font-medium">{buttonText}</span>}
      </button>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScan={onScan}
        onError={handleScanError}
      />
    </>
  );
};

BarcodeScanButton.propTypes = {
  id: PropTypes.string,
  onScan: PropTypes.func.isRequired,
  buttonText: PropTypes.string,
  className: PropTypes.string,
};

export default BarcodeScanButton;
