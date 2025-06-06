import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * MediaPreview component for displaying different types of media files
 *
 * @param {Object} props Component props
 * @param {string} props.fileType Type of file ('image', 'audio', 'pdf')
 * @param {string} props.fileUrl URL to the file
 * @param {string} props.fileName Name of the file
 * @param {string} props.className Additional CSS classes
 * @param {Object} props.style Additional inline styles
 * @param {boolean} props.showFileName Whether to show the file name
 * @param {string} props.size Size of the preview ('small', 'medium', 'large')
 * @param {boolean} props.interactive Whether to allow interaction (play audio, zoom image)
 * @param {boolean} props.useThumbnail Whether to use thumbnail version for images
 * @returns {JSX.Element} MediaPreview component
 */
const MediaPreview = ({
  fileType,
  fileUrl,
  fileName,
  className = '',
  style = {},
  showFileName = true,
  size = 'medium',
  interactive = true,
  useThumbnail = true
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Get container height based on size
  const getContainerHeight = () => {
    switch (size) {
      case 'small':
        return 'h-24';
      case 'large':
        return 'h-48';
      case 'medium':
      default:
        return 'h-32';
    }
  };

  // Handle image load
  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setIsLoading(false);
  };

  // Handle image error
  const handleImageError = () => {
    console.error('Image failed to load completely');
    setIsLoading(false);
    setError('Failed to load image');
  };

  // Reset loading state after a timeout (fallback)
  useEffect(() => {
    if (isLoading && fileType === 'image') {
      const timer = setTimeout(() => {
        console.log('Loading timeout reached, resetting loading state');
        setIsLoading(false);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timer);
    }
  }, [isLoading, fileType]);

  // Handle null or undefined fileUrl
  useEffect(() => {
    if (!fileUrl && fileType === 'image') {
      console.log('No file URL provided, showing error state');
      setIsLoading(false);
      setError('No image available');
    }
  }, [fileUrl, fileType]);

  // Toggle zoom for images
  const toggleZoom = () => {
    if (interactive && fileType === 'image') {
      setIsZoomed(!isZoomed);
    }
  };

  // Get file icon based on file type
  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'audio':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        );
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Render media based on file type
  const renderMedia = () => {
    if (isLoading && fileType === 'image') {
      return (
        <div className="animate-pulse bg-slate-200 w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 text-slate-400 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-slate-400 text-xs">Loading...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-50">
          <div className="flex flex-col items-center p-2">
            <svg className="w-8 h-8 text-red-500 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-500 text-xs text-center">{error}</span>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        // Check if fileUrl is null or undefined
        if (!fileUrl) {
          console.error('No file URL provided for image');
          return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <div className="flex flex-col items-center p-2">
                <svg className="w-8 h-8 text-slate-400 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-slate-400 text-xs text-center">No image</span>
              </div>
            </div>
          );
        }

        // For images, we use the URL as provided
        // The thumbnail parameter should already be in the URL if needed
        // Add a timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        let imageUrl = fileUrl;

        // Add timestamp to prevent caching issues if not already present
        if (!imageUrl.includes('t=')) {
          imageUrl += (imageUrl.includes('?') ? '&' : '?') + `t=${timestamp}`;
        }

        return (
          <div
            className={`w-full h-full flex items-center justify-center overflow-hidden ${interactive ? 'cursor-pointer' : ''}`}
            onClick={toggleZoom}
          >
            <img
              key={`img-${imageUrl}`} // Add key to force re-render when URL changes
              src={imageUrl}
              alt={fileName || 'Image preview'}
              className={`max-h-full max-w-full object-contain transition-transform duration-300 ${isZoomed ? 'scale-150' : ''}`}
              onLoad={(e) => {
                console.log('Image loaded successfully:', imageUrl);
                handleImageLoad();
              }}
              onError={(e) => {
                console.error('Image failed to load:', imageUrl);
                const img = e.target;

                // If thumbnail fails, try loading the original image
                if (fileUrl.includes('thumbnail=true')) {
                  console.log('Thumbnail failed to load, trying original image');

                  // Extract the base URL without query parameters
                  const baseUrl = fileUrl.split('?')[0];

                  // Add timestamp for cache busting
                  const newUrl = `${baseUrl}?t=${new Date().getTime()}`;
                  console.log('Trying with URL:', newUrl);
                  img.src = newUrl;
                } else {
                  // Last resort - try with a different timestamp
                  console.log('Original image failed to load, trying with new cache busting');

                  const newUrl = fileUrl.includes('?')
                    ? `${fileUrl.split('?')[0]}?t=${new Date().getTime()}`
                    : `${fileUrl}?t=${new Date().getTime()}`;

                  console.log('Trying with URL:', newUrl);
                  img.src = newUrl;

                  // If this is the second attempt, show error
                  if (img.dataset.retried) {
                    console.error('Multiple load attempts failed, showing error');
                    handleImageError();
                  } else {
                    img.dataset.retried = 'true';
                  }
                }
              }}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            <div className="mb-2">{getFileIcon()}</div>
            {interactive ? (
              <audio controls className="w-full max-w-[200px]">
                <source src={fileUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <div className="text-sm text-slate-500">Audio file</div>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="mb-2">{getFileIcon()}</div>
            {interactive ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-800 text-sm underline"
              >
                View PDF
              </a>
            ) : (
              <div className="text-sm text-slate-500">PDF document</div>
            )}
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            {getFileIcon()}
          </div>
        );
    }
  };

  return (
    <div
      className={`bg-slate-100 rounded-md overflow-hidden ${getContainerHeight()} ${className}`}
      style={style}
    >
      {renderMedia()}
      {showFileName && fileName && (
        <div className="bg-slate-800 bg-opacity-70 text-white text-xs py-1 px-2 absolute bottom-0 left-0 right-0 truncate">
          {fileName}
        </div>
      )}
    </div>
  );
};

MediaPreview.propTypes = {
  fileType: PropTypes.oneOf(['image', 'audio', 'pdf']).isRequired,
  fileUrl: PropTypes.string.isRequired,
  fileName: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  showFileName: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  interactive: PropTypes.bool,
  useThumbnail: PropTypes.bool
};

export default MediaPreview;
