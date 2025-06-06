import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllEquipmentLogs } from '../services/equipmentLogService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  FilterIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon
} from '../components/Icons';

const EquipmentLogsPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    equipmentId: '',
    actionType: '',
    search: '',
    type: '',
    status: '',
    location_id: ''
  });

  // Fetch equipment types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery(
    ['locations'],
    getLocations
  );

  // Fetch all equipment logs
  const { data, isLoading, isError, error } = useQuery(
    ['allEquipmentLogs', page, limit, filters, sortBy, sortOrder],
    () => getAllEquipmentLogs({
      page,
      limit,
      equipmentId: filters.equipmentId || undefined,
      actionType: filters.actionType || undefined,
      search: filters.search || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      location_id: filters.location_id || undefined,
      sortBy,
      sortOrder
    }),
    {
      keepPreviousData: true,
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

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    // Search is already applied via the filters state
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to descending
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Equipment Movement Logs</h1>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label htmlFor="search" className="label">Search</label>
            <div className="input-group">
              <SearchIcon className="input-icon w-4 h-4" />
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search logs..."
                className="input input-with-icon"
              />
            </div>
          </div>

          <div>
            <label htmlFor="type" className="label">Equipment Type</label>
            <select
              id="type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Types</option>
              {typesData?.types && typesData.types.length > 0 ? (
                typesData.types.map((type) => (
                  <option key={type.id} value={type.name.toLowerCase()}>
                    {type.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading types...</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="label">Equipment Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="in-use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label htmlFor="location_id" className="label">Location</label>
            <select
              id="location_id"
              name="location_id"
              value={filters.location_id}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Locations</option>
              {locationsData?.locations?.map((location) => (
                <option key={location.id} value={location.id.toString()}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="actionType" className="label">Action Type</label>
            <select
              id="actionType"
              name="actionType"
              value={filters.actionType}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="status_change">Status Change</option>
              <option value="location_change">Location Change</option>
            </select>
          </div>

          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              <FilterIcon className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Equipment Logs Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-10">Loading...</div>
        ) : isError ? (
          <div className="text-center py-10 text-red-600">
            Error: {error.message || 'Failed to load equipment logs'}
          </div>
        ) : !data?.logs?.length ? (
          <div className="text-center py-10 text-slate-500">
            {filters.search || filters.equipmentId || filters.actionType ?
              'No logs found matching your search criteria.' :
              'No logs found.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Equipment</th>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Action</th>
                  <th className="table-header-cell">Details</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {data.logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="table-cell whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="table-cell">
                      {log.equipment ? (
                        <Link
                          to={`/equipment/${log.equipment.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {log.equipment.brand} {log.equipment.model}
                          <span className="text-xs text-slate-500 block">
                            SN: {log.equipment.serial_number}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Deleted equipment</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {log.user?.username || 'Unknown'}
                      <span className="text-xs text-slate-500 block">
                        {log.user?.role || ''}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getActionBadgeClass(log.action_type)}`}>
                        {formatActionType(log.action_type)}
                      </span>
                    </td>
                    <td className="table-cell">
                      {log.action_type === 'status_change' && (
                        <div className="text-sm">
                          <span className="font-medium">Status:</span>{' '}
                          <span className="badge badge-outline-secondary">{log.previous_status}</span>{' '}
                          <span className="text-slate-400">→</span>{' '}
                          <span className="badge badge-outline-primary">{log.new_status}</span>
                        </div>
                      )}

                      {log.action_type === 'location_change' && (
                        <div className="text-sm">
                          <span className="font-medium">Location:</span>{' '}
                          <span className="badge badge-outline-secondary">{log.previous_location || 'None'}</span>{' '}
                          <span className="text-slate-400">→</span>{' '}
                          <span className="badge badge-outline-primary">{log.new_location || 'None'}</span>
                        </div>
                      )}

                      {log.details && (
                        <div className="text-sm mt-1">{log.details}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-slate-800">{Math.min(page * limit, data.total)}</span> of{' '}
              <span className="font-medium text-slate-800">{data.total}</span> logs
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className={`btn ${
                  page === 1 ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'btn-outline'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === data.totalPages}
                className={`btn ${
                  page === data.totalPages ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'btn-outline'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentLogsPage;
