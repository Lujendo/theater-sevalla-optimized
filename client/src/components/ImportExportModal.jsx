import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { exportEquipment, importEquipment, downloadBlob } from '../services/importExportService';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const ImportExportModal = ({ isOpen, onClose, filters = {}, selectedItems = [] }) => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportSelected, setExportSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has permission to use this feature
  const hasPermission = user && (user.role === 'admin' || user.role === 'advanced');

  // Handle file drop for import
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setImportFile(acceptedFiles[0]);
        setError('');
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json']
    },
    maxFiles: 1
  });

  // Handle export
  const handleExport = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get current date for filename
      const date = new Date().toISOString().split('T')[0];

      // Prepare export options
      const exportOptions = {
        ...filters
      };

      // If exporting selected items, add them to the options
      if (exportSelected && selectedItems.length > 0) {
        exportOptions.selectedIds = selectedItems;
      }

      // Export data
      const blob = await exportEquipment(exportFormat, exportOptions);

      // Generate filename based on format and whether we're exporting selected items
      let filename;
      const filePrefix = exportSelected && selectedItems.length > 0
        ? `equipment_selected_${selectedItems.length}_items_${date}`
        : `equipment_export_${date}`;

      switch (exportFormat) {
        case 'csv':
          filename = `${filePrefix}.csv`;
          break;
        case 'xlsx':
          filename = `${filePrefix}.xlsx`;
          break;
        case 'json':
          filename = `${filePrefix}.json`;
          break;
        default:
          filename = filePrefix;
      }

      // Download the file
      downloadBlob(blob, filename);

      setIsLoading(false);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setResults(null);

      // Import data
      const response = await importEquipment(importFile, {
        updateExisting
      });

      // Set results
      setResults(response.results);

      // Refresh the equipment list
      queryClient.invalidateQueries(['equipment']);

      setIsLoading(false);
      setImportFile(null);

      // If import was successful with no errors, close the modal after 3 seconds
      if (response.results.errors.length === 0) {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setError('Failed to import data. Please check your file and try again.');
      setIsLoading(false);
    }
  };

  // If modal is not open or user doesn't have permission, don't render
  if (!isOpen || !hasPermission) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Import/Export Equipment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${activeTab === 'export' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'import' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'export' ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <span className="ml-2">CSV</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name="exportFormat"
                      value="xlsx"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                    />
                    <span className="ml-2">Excel (XLSX)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                    />
                    <span className="ml-2">JSON</span>
                  </label>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Export Scope
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name="exportScope"
                        checked={!exportSelected}
                        onChange={() => setExportSelected(false)}
                      />
                      <span className="ml-2">All equipment (with filters)</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name="exportScope"
                        checked={exportSelected}
                        onChange={() => setExportSelected(true)}
                      />
                      <span className="ml-2">Selected items only ({selectedItems.length})</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {exportSelected && selectedItems.length > 0
                    ? `This will export ${selectedItems.length} selected equipment items.`
                    : 'This will export all equipment data based on your current filters.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  className={`btn ${isLoading ? 'bg-blue-400' : 'btn-primary'}`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </div>
                  ) : 'Export'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input {...getInputProps()} />
                  {importFile ? (
                    <div>
                      <p className="text-green-600">File selected: {importFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : isDragActive ? (
                    <p className="text-blue-500">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="mb-2">
                        Drag & drop a file here, or click to select a file
                      </p>
                      <p className="text-sm text-gray-500">
                        Accepted file types: CSV, XLSX, JSON
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                  />
                  <span className="ml-2">Update existing equipment if found</span>
                </label>
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              {results && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-medium text-green-800 mb-2">Import Results</h3>
                  <ul className="text-sm text-green-700">
                    <li>Total records processed: {results.total}</li>
                    <li>New records created: {results.created}</li>
                    <li>Existing records updated: {results.updated}</li>
                    <li>Errors: {results.errors.length}</li>
                  </ul>
                  {results.errors.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-medium text-red-800">Errors:</h4>
                      <ul className="text-sm text-red-700 mt-1 max-h-32 overflow-y-auto">
                        {results.errors.map((error, index) => (
                          <li key={index}>
                            {error.record.serial_number || error.record.id || `Row ${index + 1}`}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || !importFile}
                  className={`btn ${isLoading ? 'bg-blue-400' : 'btn-primary'}`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </div>
                  ) : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportExportModal;
