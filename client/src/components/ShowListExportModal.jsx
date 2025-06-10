import React, { useState } from 'react';
import {
  exportShowListToPDF,
  exportShowListToExcel,
  downloadPDF,
  downloadExcel,
  generateFilename
} from '../utils/showListExport';
import { toast } from 'react-hot-toast';

const ShowListExportModal = ({ 
  isOpen, 
  onClose, 
  show, 
  equipmentList = [] 
}) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeImages: false,
    includeNotes: true,
    includeQuantities: true,
    includeStatus: true,
    includeDetails: true,
    orientation: 'portrait'
  });
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleOptionChange = (option, value) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleExport = async () => {
    if (!show || !equipmentList.length) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    
    try {
      const filename = customFilename || generateFilename(show, exportFormat);
      
      if (exportFormat === 'pdf') {
        const doc = exportShowListToPDF(show, equipmentList, exportOptions);
        downloadPDF(doc, filename);
        toast.success('PDF exported successfully!');
      } else if (exportFormat === 'excel') {
        const workbook = exportShowListToExcel(show, equipmentList, exportOptions);
        downloadExcel(workbook, filename);
        toast.success('Excel file exported successfully!');
      }
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const previewFilename = customFilename || generateFilename(show, exportFormat);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Export Equipment List</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {show?.name} • {equipmentList.length} items
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-6">
            {/* Export Format Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    exportFormat === 'pdf'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-slate-500">Professional format for printing</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    exportFormat === 'excel'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-medium">Excel</div>
                  <div className="text-xs text-slate-500">Editable spreadsheet format</div>
                </button>
              </div>
            </div>

            {/* PDF-specific options */}
            {exportFormat === 'pdf' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  PDF Options
                </label>
                <div className="space-y-3">
                  <select
                    value={exportOptions.orientation}
                    onChange={(e) => handleOptionChange('orientation', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="portrait">Portrait (Recommended)</option>
                    <option value="landscape">Landscape (More columns)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Content Options */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Include in Export
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeQuantities}
                    onChange={(e) => handleOptionChange('includeQuantities', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Quantities (Needed/Allocated)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStatus}
                    onChange={(e) => handleOptionChange('includeStatus', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Equipment Status</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDetails}
                    onChange={(e) => handleOptionChange('includeDetails', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Location & Category Details</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeNotes}
                    onChange={(e) => handleOptionChange('includeNotes', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Notes & Comments</span>
                </label>
              </div>
            </div>

            {/* Custom Filename */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Custom Filename (Optional)
              </label>
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={previewFilename}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Default: {previewFilename}</p>
            </div>

            {/* Export Preview */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-800 mb-2">Export Preview</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <div>Format: <span className="font-medium">{exportFormat.toUpperCase()}</span></div>
                <div>Items: <span className="font-medium">{equipmentList.length}</span></div>
                <div>Filename: <span className="font-medium">{previewFilename}</span></div>
                {exportFormat === 'pdf' && (
                  <div>Orientation: <span className="font-medium">{exportOptions.orientation}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting || !equipmentList.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowListExportModal;
