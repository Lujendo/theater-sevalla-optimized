import React from 'react';
import PropTypes from 'prop-types';
import BarcodeScanButton from '../BarcodeScanButton';

/**
 * BarcodeInput component - extends the standard Input component with barcode scanning functionality
 */
const BarcodeInput = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  className = '',
  onScan,
  ...props
}) => {
  // Base classes
  const baseClasses = 'rounded-l-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

  // Error classes
  const errorClasses = error
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-slate-300 text-slate-900 placeholder-slate-400';

  // Disabled classes
  const disabledClasses = disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-white';

  // Combine all classes
  const inputClasses = `
    ${baseClasses}
    ${errorClasses}
    ${disabledClasses}
    py-2 px-3 text-sm
    w-full
    ${className}
  `;

  // Generate a unique ID for the hidden barcode button
  const barcodeBtnId = `barcode-scan-button-${id}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium mb-1 ${error ? 'text-red-600' : 'text-slate-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex" style={{ display: 'flex', width: '100%' }}>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          style={{ width: 'calc(100% - 120px)' }}
          {...props}
        />

        <button
          type="button"
          onClick={() => {
            const barcodeButton = document.getElementById(barcodeBtnId);
            if (barcodeButton) barcodeButton.click();
          }}
          className="w-[120px] bg-white text-primary-600 hover:bg-primary-50 border border-primary-500
            hover:border-primary-600 hover:shadow-sm transition-all font-medium flex items-center
            justify-center rounded-r-md border-l-0"
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
            id={barcodeBtnId}
            onScan={onScan}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

BarcodeInput.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  onScan: PropTypes.func.isRequired,
};

export default BarcodeInput;
