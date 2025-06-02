import React, { useState } from 'react';
import { deleteFile } from '../services/equipmentService';

const FileDeleteTest = () => {
  const [fileId, setFileId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!fileId) {
      setError('Please enter a file ID');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      console.log(`Attempting to delete file with ID: ${fileId}`);
      const response = await deleteFile(fileId);
      console.log('Delete response:', response);
      setStatus(`File deleted successfully: ${JSON.stringify(response)}`);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">File Deletion Test</h2>
      
      <div className="mb-4">
        <label htmlFor="fileId" className="block text-sm font-medium text-gray-700 mb-1">
          File ID
        </label>
        <input
          type="text"
          id="fileId"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter file ID"
        />
      </div>
      
      <button
        onClick={handleDelete}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
      >
        {loading ? 'Deleting...' : 'Delete File'}
      </button>
      
      {status && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileDeleteTest;
