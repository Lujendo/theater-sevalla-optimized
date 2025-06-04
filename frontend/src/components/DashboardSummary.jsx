import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PropTypes from 'prop-types';

const DashboardSummary = ({ stats, isLoading, onFilterByStatus, onFilterByType }) => {
  const { user } = useAuth();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => onFilterByStatus('')}
          className="card bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors cursor-pointer text-left"
          title="Show all equipment"
        >
          <h3 className="text-lg font-semibold text-blue-700">Total Equipment</h3>
          <p className="text-3xl font-bold mt-2">{isLoading ? '...' : stats?.total || 0}</p>
        </button>

        <button
          onClick={() => onFilterByStatus('available')}
          className="card bg-green-50 border-l-4 border-green-500 hover:bg-green-100 transition-colors cursor-pointer text-left"
          title="Filter by available equipment"
        >
          <h3 className="text-lg font-semibold text-green-700">Available</h3>
          <p className="text-3xl font-bold mt-2">{isLoading ? '...' : stats?.available || 0}</p>
        </button>

        <button
          onClick={() => onFilterByStatus('in-use')}
          className="card bg-yellow-50 border-l-4 border-yellow-500 hover:bg-yellow-100 transition-colors cursor-pointer text-left"
          title="Filter by in-use equipment"
        >
          <h3 className="text-lg font-semibold text-yellow-700">In Use</h3>
          <p className="text-3xl font-bold mt-2">{isLoading ? '...' : stats?.inUse || 0}</p>
        </button>

        <button
          onClick={() => onFilterByStatus('maintenance')}
          className="card bg-red-50 border-l-4 border-red-500 hover:bg-red-100 transition-colors cursor-pointer text-left"
          title="Filter by equipment in maintenance"
        >
          <h3 className="text-lg font-semibold text-red-700">Maintenance</h3>
          <p className="text-3xl font-bold mt-2">{isLoading ? '...' : stats?.maintenance || 0}</p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Equipment by Type</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {stats?.types && Object.entries(stats.types || {}).map(([type, count]) => (
                <button
                  key={type}
                  className="flex justify-between items-center w-full px-3 py-2 hover:bg-slate-50 rounded-md transition-colors text-left"
                  onClick={() => onFilterByType(type)}
                  title={`Filter by ${type} equipment`}
                >
                  <span className="capitalize">{type}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              ))}
              {(!stats?.types || Object.keys(stats?.types || {}).length === 0) && (
                <p className="text-gray-500">No equipment data available</p>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/equipment"
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              View All Equipment
            </Link>
            <Link
              to="/equipment/new"
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Add New Equipment
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/users"
                className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Manage Users
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

DashboardSummary.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number,
    available: PropTypes.number,
    inUse: PropTypes.number,
    maintenance: PropTypes.number,
    types: PropTypes.object
  }),
  isLoading: PropTypes.bool,
  onFilterByStatus: PropTypes.func,
  onFilterByType: PropTypes.func
};

DashboardSummary.defaultProps = {
  onFilterByStatus: () => {},
  onFilterByType: () => {}
};

export default DashboardSummary;
