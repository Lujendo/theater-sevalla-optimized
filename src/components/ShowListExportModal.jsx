import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header>
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <Modal.Title>Export Equipment List</Modal.Title>
            <p className="text-sm text-slate-600 mt-1">
              {show?.name} • {equipmentList.length} items
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-6">
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
                <Select
                  label="Page Orientation"
                  value={exportOptions.orientation}
                  onChange={(e) => handleOptionChange('orientation', e.target.value)}
                  options={[
                    { value: 'portrait', label: 'Portrait (Recommended)' },
                    { value: 'landscape', label: 'Landscape (More columns)' }
                  ]}
                />
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
            <Input
              label="Custom Filename (Optional)"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={previewFilename}
              helpText={`Default: ${previewFilename}`}
            />
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
      </Modal.Body>

      <Modal.Footer>
        <div className="flex justify-between w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting || !equipmentList.length}
            className="flex items-center"
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
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ShowListExportModal;
