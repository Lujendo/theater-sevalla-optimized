import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({
  onFileSelect,
  uploadProgress = 0,
  existingFiles = [],
  onFileDelete,
  multiple = false,
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024 // 50MB default
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);

  // Generate previews for image files
  useEffect(() => {
    // Clean up previous previews
    Object.values(previews).forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });

    const newPreviews = {};

    // Create previews for newly selected files
    selectedFiles.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        newPreviews[`new-${index}`] = URL.createObjectURL(file);
      }
    });

    // Create previews for existing files
    existingFiles.forEach(file => {
      if (file.file_type === 'image') {
        newPreviews[`existing-${file.id}`] = `/api/files/${file.id}`;
      }
    });

    setPreviews(newPreviews);

    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      Object.values(newPreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [selectedFiles, existingFiles]);

  const validateFiles = (files) => {
    const errors = [];
    const validFiles = [];

    files.forEach(file => {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name} exceeds the maximum file size of ${Math.round(maxFileSize / (1024 * 1024))}MB`);
        return;
      }

      // Check file type
      const validTypes = [
        'image/jpeg',
        'image/png',
        'audio/mpeg',
        'application/pdf'
      ];

      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name} has an unsupported file type. Only JPEG, PNG, MP3, and PDF files are allowed.`);
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors };
  };

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles && rejectedFiles.length > 0) {
        const rejectionErrors = rejectedFiles.map(rejection =>
          `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
        );
        setValidationErrors(rejectionErrors);
      } else {
        setValidationErrors([]);
      }

      // Validate accepted files
      const { validFiles, errors } = validateFiles(acceptedFiles);

      if (errors.length > 0) {
        setValidationErrors(prev => [...prev, ...errors]);
      }

      // Check if adding these files would exceed the max files limit
      if (multiple && (selectedFiles.length + validFiles.length) > maxFiles) {
        setValidationErrors(prev => [
          ...prev,
          `You can only upload a maximum of ${maxFiles} files.`
        ]);

        // Only take the first N files that would fit within the limit
        const availableSlots = maxFiles - selectedFiles.length;
        if (availableSlots > 0) {
          const limitedFiles = validFiles.slice(0, availableSlots);
          setSelectedFiles(prev => [...prev, ...limitedFiles]);
          onFileSelect(limitedFiles);
        }
      } else {
        setSelectedFiles(multiple ? prev => [...prev, ...validFiles] : validFiles);
        onFileSelect(validFiles);
      }
    },
    [onFileSelect, selectedFiles, multiple, maxFiles, maxFileSize]
  );

  const handleRemoveFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFileSelect(multiple ? newFiles : newFiles.length > 0 ? [newFiles[0]] : []);

    // Clear any validation errors
    setValidationErrors([]);
  };

  const handleDeleteExistingFile = (fileId) => {
    if (onFileDelete) {
      console.log(`FileUpload: Deleting file with ID ${fileId}`);
      try {
        onFileDelete(fileId);
      } catch (error) {
        console.error(`Error deleting file with ID ${fileId}:`, error);
      }
    } else {
      console.warn(`FileUpload: No onFileDelete handler provided for file ID ${fileId}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'audio/mpeg': ['.mp3'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    maxSize: maxFileSize,
  });

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image/jpeg':
      case 'image/png':
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'audio/mpeg':
      case 'audio':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        );
      case 'application/pdf':
      case 'pdf':
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

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
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
              Accepted file types: JPEG, PNG, MP3, PDF (Max: {maxFiles} files, {Math.round(maxFileSize / (1024 * 1024))}MB each)
            </p>
          </div>
        )}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800 mb-1">File validation errors:</h3>
          <ul className="list-disc pl-5 text-xs text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Files to upload:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col">
                {file.type.startsWith('image/') ? (
                  <div className="h-32 bg-slate-100 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                    {previews[`new-${index}`] ? (
                      <img
                        src={previews[`new-${index}`]}
                        alt={file.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="animate-pulse bg-slate-200 w-full h-full"></div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-slate-100 rounded-md mb-2 flex items-center justify-center">
                    <div className="text-4xl">{getFileIcon(file.type)}</div>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="ml-2 text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                    aria-label={`Remove ${file.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Existing files:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {existingFiles.map((file) => (
              <div key={file.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col">
                {file.file_type === 'image' ? (
                  <div className="h-32 bg-slate-100 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                    {previews[`existing-${file.id}`] ? (
                      <img
                        src={previews[`existing-${file.id}`]}
                        alt={file.file_name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="animate-pulse bg-slate-200 w-full h-full"></div>
                    )}
                  </div>
                ) : file.file_type === 'audio' ? (
                  <div className="h-32 bg-slate-100 rounded-md mb-2 flex flex-col items-center justify-center p-2">
                    <div className="text-4xl mb-2">{getFileIcon(file.file_type)}</div>
                    <audio controls className="w-full max-w-[200px]">
                      <source src={`/api/files/${file.id}`} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <div className="h-32 bg-slate-100 rounded-md mb-2 flex items-center justify-center">
                    <div className="text-4xl">{getFileIcon(file.file_type)}</div>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={file.file_name}>{file.file_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{file.file_type}</p>
                  </div>
                  <div className="flex space-x-1">
                    <a
                      href={`/api/files/${file.id}?download=true`}
                      download
                      className="text-primary-600 hover:text-primary-800 p-1 rounded-full hover:bg-primary-50"
                      aria-label={`Download ${file.file_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`Downloading file: ${file.id}`);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                    {onFileDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(`Deleting file: ${file.id}`);
                          handleDeleteExistingFile(file.id);
                        }}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        aria-label={`Delete ${file.file_name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress > 0 && (
        <div className="mt-4">
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
  );
};

export default FileUpload;
