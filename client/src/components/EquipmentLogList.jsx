import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEquipmentLogs } from '../services/equipmentLogService';
import { format } from 'date-fns';

const EquipmentLogList = ({ equipmentId }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch equipment logs
  const { data, isLoading, isError, error } = useQuery(
    ['equipmentLogs', equipmentId, page, limit],
    () => getEquipmentLogs(equipmentId, { page, limit }),
    {
      keepPreviousData: true,
      enabled: !!equipmentId,
    }
  );

  // Get badge class based on action type
  const getActionBadgeClass = (actionType) => {
    switch (actionType) {
      case 'created':
        return 'badge-success';
      case 'updated':
        return 'badge-info';
      case 'deleted':
        return 'badge-danger';
      case 'status_change':
        return 'badge-warning';
      case 'location_change':
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  };

  // Format action type for display
  const formatActionType = (actionType) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 flex flex-col items-center">
        <svg className="animate-spin h-8 w-8 text-primary-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-slate-600">Loading movement history...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 flex flex-col items-center">
        <div className="bg-red-100 p-3 rounded-full mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-1">Error Loading Movement History</p>
        <p className="text-slate-500 text-sm">{error.message || 'Failed to load equipment logs'}</p>
      </div>
    );
  }

  if (!data?.logs?.length) {
    return (
      <div className="text-center py-8 flex flex-col items-center">
        <div className="bg-slate-100 p-3 rounded-full mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">No movement history found</p>
        <p className="text-slate-500 text-sm mt-1">This equipment has no recorded movements or status changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  User
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Action
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.logs.map((log, index) => (
              <tr key={log.id} className={`hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  <div className="flex items-center">
                    <span className="font-medium">{format(new Date(log.created_at), 'MMM d, yyyy')}</span>
                    <span className="ml-2 text-slate-500">{format(new Date(log.created_at), 'h:mm a')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">
                      {log.user?.username ? log.user.username.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-slate-800">{log.user?.username || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 capitalize">{log.user?.role || ''}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${log.action_type === 'created' ? 'bg-green-100 text-green-800' :
                      log.action_type === 'updated' ? 'bg-blue-100 text-blue-800' :
                      log.action_type === 'deleted' ? 'bg-red-100 text-red-800' :
                      log.action_type === 'status_change' ? 'bg-yellow-100 text-yellow-800' :
                      log.action_type === 'location_change' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-800'}`}>
                    {log.action_type === 'created' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {log.action_type === 'updated' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                    {log.action_type === 'deleted' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {log.action_type === 'status_change' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    {log.action_type === 'location_change' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {formatActionType(log.action_type)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {log.action_type === 'status_change' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-700">Status:</span>
                      <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">{log.previous_status}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 font-medium">{log.new_status}</span>
                    </div>
                  )}

                  {log.action_type === 'location_change' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-700">Location:</span>
                      <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">{log.previous_location || 'None'}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 font-medium">{log.new_location || 'None'}</span>
                    </div>
                  )}

                  {log.details && (
                    <div className="mt-2 text-slate-600">{log.details}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 px-2">
          <div className="text-sm text-slate-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Showing <span className="font-medium text-slate-800 mx-1">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-medium text-slate-800 mx-1">{Math.min(page * limit, data.total)}</span> of{' '}
            <span className="font-medium text-slate-800 mx-1">{data.total}</span> logs
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
                page === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-slate-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${page === 1 ? 'text-slate-300' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.totalPages}
              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
                page === data.totalPages
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-slate-400'
              }`}
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${page === data.totalPages ? 'text-slate-300' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentLogList;
