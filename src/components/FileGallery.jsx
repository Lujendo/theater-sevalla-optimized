import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MediaPreview from './MediaPreview';

/**
 * FileGallery component for displaying a collection of files
 *
 * @param {Object} props Component props
 * @param {Array} props.files Array of file objects
 * @param {Function} props.onFileDelete Callback when a file is deleted
 * @param {boolean} props.canDelete Whether files can be deleted
 * @param {boolean} props.showDownload Whether to show download buttons
 * @param {string} props.layout Layout style ('grid', 'list')
 * @param {string} props.size Size of the previews ('small', 'medium', 'large')
 * @returns {JSX.Element} FileGallery component
 */
const FileGallery = ({
  files = [],
  onFileDelete,
  canDelete = false,
  showDownload = true,
  layout = 'grid',
  size = 'medium'
}) => {
  const [activeFile, setActiveFile] = useState(null);

  // Handle file click
  const handleFileClick = (file) => {
    setActiveFile(file);
  };

  // Close modal
  const closeModal = () => {
    setActiveFile(null);
  };

  // Get file URL
  const getFileUrl = (fileId, forDownload = false, useThumbnail = false) => {
    let url = `/api/files/${fileId}`;

    // Add query parameters
    const params = [];
    if (forDownload) params.push('download=true');
    if (useThumbnail) params.push('thumbnail=true');

    // Add query string if we have parameters
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return url;
  };

  // Render file preview modal
  const renderFileModal = () => {
    if (!activeFile) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeModal}>
        <div className="bg-white rounded-lg overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900">{activeFile.file_name}</h3>
            <button
              type="button"
              onClick={closeModal}
              className="text-slate-400 hover:text-slate-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {activeFile.file_type === 'image' ? (
              <img
                src={getFileUrl(activeFile.id)}
                alt={activeFile.file_name}
                className="max-w-full max-h-[70vh] object-contain"
                onError={(e) => {
                  console.error('Error loading image in modal:', e);
                  // Try with cache busting
                  e.target.src = `${getFileUrl(activeFile.id)}?t=${new Date().getTime()}`;
                }}
              />
            ) : activeFile.file_type === 'audio' ? (
              <div className="w-full max-w-md p-4">
                <div className="mb-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                </div>
                <audio controls className="w-full">
                  <source src={getFileUrl(activeFile.id)} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : activeFile.file_type === 'pdf' ? (
              <div className="w-full h-[70vh]">
                <iframe
                  src={`${getFileUrl(activeFile.id)}#view=FitH`}
                  title={activeFile.file_name}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="text-center p-4">
                <p>This file type cannot be previewed.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end space-x-2">
            <a
              href={getFileUrl(activeFile.id, true)}
              download
              className="btn btn-secondary"
            >
              Download
            </a>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  onFileDelete(activeFile.id);
                  closeModal();
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render grid layout
  const renderGridLayout = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div key={file.id} className="relative group">
            <div
              className="cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              onClick={() => handleFileClick(file)}
            >
              <MediaPreview
                fileType={file.file_type}
                fileUrl={getFileUrl(file.id, false, file.file_type === 'image')}
                fileName={file.file_name}
                size={size}
                interactive={false}
                useThumbnail={file.file_type === 'image'}
              />
              <div className="p-2">
                <p className="text-sm font-medium truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {file.file_type}
                </p>
              </div>
            </div>

            {/* Overlay actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              {showDownload && (
                <a
                  href={getFileUrl(file.id, true)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white p-1.5 rounded-full shadow-md text-primary-600 hover:text-primary-800"
                  title="Download file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }}
                  className="bg-white p-1.5 rounded-full shadow-md text-red-600 hover:text-red-800"
                  title="Delete file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render list layout
  const renderListLayout = () => {
    return (
      <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center p-3 hover:bg-slate-50 cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div className="flex-shrink-0 mr-3 w-12 h-12 relative">
              <MediaPreview
                fileType={file.file_type}
                fileUrl={getFileUrl(file.id, false, file.file_type === 'image')}
                fileName={file.file_name}
                size="small"
                showFileName={false}
                interactive={false}
                useThumbnail={file.file_type === 'image'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={file.file_name}>
                {file.file_name}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {file.file_type}
              </p>
            </div>
            <div className="flex space-x-2 ml-2">
              {showDownload && (
                <a
                  href={getFileUrl(file.id, true)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-600 hover:text-primary-800 p-1.5"
                  title="Download file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }}
                  className="text-red-600 hover:text-red-800 p-1.5"
                  title="Delete file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (files.length === 0) {
    return <p className="text-slate-500 italic">No files available</p>;
  }

  return (
    <div>
      {layout === 'grid' ? renderGridLayout() : renderListLayout()}
      {renderFileModal()}
    </div>
  );
};

FileGallery.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      file_type: PropTypes.string.isRequired,
      file_name: PropTypes.string.isRequired
    })
  ).isRequired,
  onFileDelete: PropTypes.func,
  canDelete: PropTypes.bool,
  showDownload: PropTypes.bool,
  layout: PropTypes.oneOf(['grid', 'list']),
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default FileGallery;
