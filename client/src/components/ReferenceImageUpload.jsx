import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';

const ReferenceImageUpload = ({
  onImageSelect,
  existingImage = null,
  onImageDelete,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Set up preview URL when existing image changes
  useEffect(() => {
    if (existingImage) {
      // Use thumbnail for better performance if available
      setPreviewUrl(`/api/files/${existingImage.id}?thumbnail=true`);
    } else {
      setPreviewUrl(null);
    }
  }, [existingImage]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('/api/files/')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('Image is too large. Maximum size is 10MB.');
          return;
        }

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (previewUrl && !previewUrl.startsWith('/api/files/')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageSelect(null);
  };

  const handleDeleteExistingImage = () => {
    if (onImageDelete && existingImage) {
      onImageDelete(existingImage.id);
      setPreviewUrl(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div>
      {!previewUrl ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-primary-500">Drop the image here...</p>
          ) : (
            <div>
              <p className="mb-2">
                Drag & drop a reference image here, or click to select
              </p>
              <p className="text-sm text-slate-500">
                Accepted file types: JPEG, PNG (Max: 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  {existingImage ? existingImage.file_name : selectedImage?.name || 'Reference Image'}
                </span>
              </div>
              <button
                type="button"
                onClick={existingImage ? handleDeleteExistingImage : handleRemoveImage}
                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="mt-2 flex justify-center" style={{ height: '200px' }}>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-100 rounded-md">
                <img
                  src={previewUrl}
                  alt="Reference Image Preview"
                  className="rounded-md max-h-full max-w-full"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    e.target.src = '/placeholder-image.png';
                    e.target.onerror = null;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReferenceImageUpload.propTypes = {
  onImageSelect: PropTypes.func.isRequired,
  existingImage: PropTypes.object,
  onImageDelete: PropTypes.func,
};

export default ReferenceImageUpload;
