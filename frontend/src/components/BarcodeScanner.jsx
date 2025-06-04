import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-toastify';

/**
 * A component that provides barcode and QR code scanning functionality
 *
 * @param {Object} props - Component props
 * @param {Function} props.onScan - Callback function when a barcode is successfully scanned
 * @param {Function} props.onError - Callback function when an error occurs during scanning
 * @param {boolean} props.isOpen - Whether the scanner is open/visible
 * @param {Function} props.onClose - Callback function when the scanner is closed
 * @returns {JSX.Element} The barcode scanner component
 */
const BarcodeScanner = ({ onScan, onError = (error) => console.error(error), isOpen, onClose }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Initialize scanner when component mounts
  useEffect(() => {
    if (isOpen && !isStarted) {
      startScanner();
    }

    // Cleanup function to stop scanner when component unmounts
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Start the scanner
  const startScanner = async () => {
    if (!scannerRef.current) return;

    try {
      const html5QrCode = new Html5Qrcode('scanner');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          1, // CODE_39
          2, // CODE_93
          3, // CODE_128
          4, // CODABAR
          5, // EAN_8
          6, // EAN_13
          7, // ITF
          8, // QR_CODE
          9, // UPC_A
          10, // UPC_E
          11, // DATA_MATRIX
          12  // AZTEC
        ]
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // On successful scan
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // Errors are common during scanning, so we'll only log them
          console.log(errorMessage);
        }
      );

      setIsStarted(true);
    } catch (err) {
      console.error('Error starting scanner:', err);

      // Check if the error is related to camera access
      let errorMsg = '';
      let toastMsg = '';

      if (err.name === 'NotFoundError' || (err.message && err.message.includes('Requested device not found'))) {
        errorMsg = 'No camera found. Please make sure your device has a camera and you have granted permission to use it.';
        toastMsg = 'No camera detected. You can manually enter the barcode value instead.';
        toast.error(toastMsg, {
          icon: '📷❌',
          toastId: 'camera-not-found'
        });
      } else if (err.name === 'NotAllowedError' || (err.message && err.message.includes('Permission denied'))) {
        errorMsg = 'Camera access denied. Please grant permission to use your camera.';
        toastMsg = 'Camera access denied. Please check your browser permissions.';
        toast.error(toastMsg, {
          icon: '🔒',
          toastId: 'camera-permission-denied'
        });
      } else {
        errorMsg = (err && err.message) ? err.message : 'Failed to start scanner';
        toast.error('Failed to start barcode scanner. Please try again later.', {
          toastId: 'scanner-error'
        });
      }

      setErrorMessage(errorMsg);
      onError(errorMsg);

      // Close the scanner when there's a camera error
      onClose();
    }
  };

  // Stop the scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isStarted) {
      try {
        await html5QrCodeRef.current.stop();
        setIsStarted(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  // Handle close button click
  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Scan Barcode</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div id="scanner" ref={scannerRef} className="w-full h-64 bg-gray-100 rounded flex items-center justify-center">
            {errorMessage && (
              <div className="text-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 font-medium">{errorMessage}</p>
                <p className="text-gray-600 mt-2">You can manually enter the barcode value instead.</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          {!errorMessage ?
            "Position the barcode within the scanner area. The scanner will automatically detect and process the code." :
            "To use the barcode scanner, you need a device with a camera and permission to access it."
          }
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

BarcodeScanner.propTypes = {
  onScan: PropTypes.func.isRequired,
  onError: PropTypes.func,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BarcodeScanner;
