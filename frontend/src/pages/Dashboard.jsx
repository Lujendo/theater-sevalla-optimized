import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEquipment } from '../services/equipmentService';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { debounce } from 'lodash';
import { SearchIcon } from '../components/Icons';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Infinite scroll
  const observerTarget = useRef(null);

  // Stats query
  const { data: stats = { total: 0, available: 0, inUse: 0, maintenance: 0 } } = useQuery({
    queryKey: ['equipment-stats'],
    queryFn: async () => {
      const response = await getEquipment({ page: 1, limit: 1000 });
      const equipment = response.equipment || [];
      
      return {
        total: equipment.length,
        available: equipment.filter(item => item.status === 'available').length,
        inUse: equipment.filter(item => item.status === 'in-use').length,
        maintenance: equipment.filter(item => item.status === 'maintenance').length,
      };
    },
    enabled: !hasSearched,
  });

  // Search equipment query
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['equipment-search', searchTerm],
    queryFn: ({ pageParam = 1 }) => getEquipment({
      page: pageParam,
      limit: 20,
      search: searchTerm,
    }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    enabled: hasSearched && searchTerm.length > 0,
  });

  // Flatten equipment list from pages
  const equipmentList = searchData?.pages?.flatMap(page => page.equipment || []) || [];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term) => {
      if (term.trim()) {
        setHasSearched(true);
        queryClient.invalidateQueries(['equipment-search', term]);
      } else {
        setHasSearched(false);
      }
    }, 300),
    [queryClient]
  );

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Clear search
  const clearFilters = () => {
    setSearchTerm('');
    setHasSearched(false);
    queryClient.removeQueries(['equipment-search']);
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">
            Welcome back, {user?.name || 'User'}! Here's an overview of your theater equipment.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search equipment by name, brand, model, or serial number..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched ? (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-slate-800">Search Results</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {equipmentList.length} items found
                </p>
              </div>
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center"
                title="Clear all filters and return to dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-red-500">
                        Error loading equipment: {error.message}
                      </td>
                    </tr>
                  ) : equipmentList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                        No equipment found matching your search criteria
                      </td>
                    </tr>
                  ) : (
                    equipmentList.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/equipment/${item.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {item.brand} {item.model}
                              </div>
                              {item.category && (
                                <div className="text-sm text-slate-500">
                                  {item.category}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.serial_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'available' 
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'in-use'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.location || 'Not specified'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Infinite scroll loading indicator */}
            <div ref={observerTarget} className="py-4 text-center">
              {isFetchingNextPage ? (
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="text-slate-500">Loading more...</span>
                </div>
              ) : hasNextPage ? (
                <span className="text-sm text-slate-500">Scroll to load more</span>
              ) : (
                <span className="text-sm text-slate-500">No more equipment to load</span>
              )}
            </div>
          </div>
        ) : (
          /* Dashboard Overview */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Equipment</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Available</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.available}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">In Use</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.inUse}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Maintenance</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.maintenance}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Dashboard;
