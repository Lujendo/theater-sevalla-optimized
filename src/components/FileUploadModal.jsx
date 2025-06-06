import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { uploadFilesForEquipment } from '../services/fileService';
import { Button } from './ui';
import { toast } from 'react-hot-toast';

/**
 * Modal component for uploading files to an equipment
 * 
 * @param {Object} props Component props
 * @param {number} props.equipmentId ID of the equipment to upload files for
 * @param {boolean} props.isOpen Whether the modal is open
 * @param {Function} props.onClose Callback when the modal is closed
 * @param {Function} props.onSuccess Callback when files are successfully uploaded
 * @returns {JSX.Element} FileUploadModal component
 */
const FileUploadModal = ({ equipmentId, isOpen, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState([]);

  // Maximum file size (50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  
  // Maximum number of files
  const MAX_FILES = 5;

  // Handle file drop
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle accepted files
    setFiles(prev => [...prev, ...acceptedFiles]);
    
    // Handle rejected files
    const newErrors = rejectedFiles.map(file => {
      if (file.file.size > MAX_FILE_SIZE) {
        return `${file.file.name} is too large. Maximum file size is 50MB.`;
      }
      return `${file.file.name} is not a supported file type.`;
    });
    
    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
    }
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'audio/mpeg': ['.mp3'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE,
  });

  // Remove a file from the list
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setErrors([]);
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image/jpeg':
      case 'image/png':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'audio/mpeg':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        );
      case 'application/pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload files
      const result = await uploadFilesForEquipment(
        equipmentId,
        files,
        (progress) => setUploadProgress(progress)
      );

      // Show success message
      toast.success(`Successfully uploaded ${result.files.length} files`);
      
      // Clear files
      setFiles([]);
      setErrors([]);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result.files);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Upload Documents
                </h3>
                
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer mb-4 ${
                    isDragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
                  }`}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p className="text-primary-500">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="mb-2">
                        Drag & drop files here, or click to select files
                      </p>
                      <p className="text-sm text-slate-500">
                        Accepted file types: JPEG, PNG, MP3, PDF (Max: {MAX_FILES} files, {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB each)
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Error messages */}
                {errors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-500 mb-1">Errors:</p>
                    <ul className="text-sm text-red-500 list-disc pl-5">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Selected files */}
                {files.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-slate-700">Selected Files:</p>
                      <button
                        type="button"
                        onClick={clearFiles}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Clear All
                      </button>
                    </div>
                    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between p-3 hover:bg-slate-50">
                          <div className="flex items-center">
                            <span className="mr-2">{getFileIcon(file.type)}</span>
                            <div>
                              <p className="text-sm font-medium truncate max-w-xs" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Upload progress */}
                {uploading && (
                  <div className="mb-4">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className="bg-primary-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Modal footer */}
          <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="w-full sm:w-auto sm:ml-3"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={uploading}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

FileUploadModal.propTypes = {
  equipmentId: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default FileUploadModal;
