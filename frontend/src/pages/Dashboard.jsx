import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../services/savedSearchService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { debounce } from 'lodash';
import {
  SearchIcon,
  FilterIcon,
  ViewIcon,
  EditIcon,
} from '../components/Icons';
import DashboardSummary from '../components/DashboardSummary';

// Import SavedSearchChip component
import SavedSearchChip from '../components/SavedSearchChip';

const Dashboard = () => {
  const { user, canEditEquipment } = useAuth();
  const queryClient = useQueryClient();
  const observerTarget = useRef(null);

  // State for filters and search
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    brand: '',
    status: '',
    location: '',
    dateRange: {
      startDate: null,
      endDate: null
    }
  });

  // State for sorting
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // State for search suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Track if search has been performed
  const [hasSearched, setHasSearched] = useState(false);

  // State for saved searches
  const [showSaveSearchInput, setShowSaveSearchInput] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');

  // State for advanced filters

  // Fetch equipment summary for stats
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery(['equipment-summary'], () =>
    getEquipment({ limit: 1000 })
  );

  // Calculate statistics
  const calculateStats = () => {
    if (!summaryData?.equipment) return { total: 0, available: 0, inUse: 0, maintenance: 0 };

    const stats = {
      total: summaryData.equipment.length,
      available: 0,
      inUse: 0,
      maintenance: 0,
      types: {}
    };

    summaryData.equipment.forEach(item => {
      // Count by status
      if (item.status === 'available') stats.available++;
      else if (item.status === 'in-use') stats.inUse++;
      else if (item.status === 'maintenance') stats.maintenance++;

      // Count by type
      if (!stats.types[item.type]) {
        stats.types[item.type] = 1;
      } else {
        stats.types[item.type]++;
      }
    });

    return stats;
  };

  const stats = calculateStats();

  // Fetch equipment with infinite query for advanced search
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery(
    ['equipment', filters, sortBy, sortOrder],
    async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        limit: 20,
        ...filters,
        sortBy,
        sortOrder
      };

      // Format date range if present
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        params.startDate = filters.dateRange.startDate.toISOString();
        params.endDate = filters.dateRange.endDate.toISOString();
      }

      return getEquipment(params);
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.page < lastPage.totalPages) {
          return lastPage.page + 1;
        }
        return undefined;
      },
      keepPreviousData: true,
    }
  );

  // Fetch search suggestions
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery(
    ['equipment-suggestions', searchQuery],
    () => getEquipment({ search: searchQuery, limit: 5 }),
    {
      enabled: !!searchQuery && searchQuery.length > 2,
      keepPreviousData: true,
    }
  );

  // Fetch saved searches (only for admin/advanced users)
  const { data: savedSearches } = useQuery(
    ['saved-searches'],
    getSavedSearches,
    {
      enabled: canEditEquipment(),
    }
  );

  // Fetch equipment types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    const updatedFilters = { ...filters, search: value };
    setFilters(updatedFilters);
    debouncedSearch(value);

    if (value.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    // Set hasSearched to true if any filter has a value
    const hasAnyFilter = Object.values(updatedFilters).some(filter =>
      filter !== '' && filter !== null &&
      (typeof filter !== 'object' || (updatedFilters.dateRange.startDate || updatedFilters.dateRange.endDate))
    );
    setHasSearched(hasAnyFilter);
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = { ...filters, [name]: value };
    setFilters(updatedFilters);

    // Set hasSearched to true if any filter has a value
    const hasAnyFilter = Object.values(updatedFilters).some(filter =>
      filter !== '' && filter !== null &&
      (typeof filter !== 'object' || (filter.startDate || filter.endDate))
    );
    setHasSearched(hasAnyFilter);
  };

  // Handle filter by status from dashboard cards
  const handleFilterByStatus = (status) => {
    const updatedFilters = {
      ...filters,
      status,
      // Clear other filters for a cleaner experience
      search: '',
      type: '',
      brand: '',
      location: '',
      dateRange: {
        startDate: null,
        endDate: null
      }
    };
    setFilters(updatedFilters);

    // Only set hasSearched to true if status is not empty
    setHasSearched(!!status);

    // Show filters panel when filtering
    if (status) {
      setShowFilters(true);
    }
  };

  // Handle filter by type from dashboard cards
  const handleFilterByType = (type) => {
    const updatedFilters = {
      ...filters,
      type: type.toLowerCase(),
      // Clear other filters for a cleaner experience
      search: '',
      status: '',
      brand: '',
      location: '',
      dateRange: {
        startDate: null,
        endDate: null
      }
    };
    setFilters(updatedFilters);

    // Set hasSearched to true since we're filtering by type
    setHasSearched(true);

    // Show filters panel when filtering
    setShowFilters(true);
  };

  // Clear all filters and return to dashboard
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      type: '',
      brand: '',
      location: '',
      dateRange: {
        startDate: null,
        endDate: null
      }
    });
    setHasSearched(false);
    setShowFilters(false);
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    const updatedFilters = {
      ...filters,
      dateRange: {
        startDate: start,
        endDate: end
      }
    };
    setFilters(updatedFilters);

    // Set hasSearched to true if any filter has a value or if date range is set
    const hasAnyFilter = Object.values(updatedFilters).some(filter =>
      filter !== '' && filter !== null &&
      (typeof filter !== 'object' || (updatedFilters.dateRange.startDate || updatedFilters.dateRange.endDate))
    );
    setHasSearched(hasAnyFilter);
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

  // Save current search
  const handleSaveSearch = async () => {
    if (!savedSearchName.trim()) {
      toast.error('Please enter a name for your saved search');
      return;
    }

    try {
      await saveSearch({
        name: savedSearchName,
        filters: JSON.stringify(filters),
        sortBy,
        sortOrder
      });

      queryClient.invalidateQueries(['saved-searches']);
      setSavedSearchName('');
      setShowSaveSearchInput(false);
      toast.success('Search saved successfully');
    } catch (error) {
      toast.error('Failed to save search');
      console.error('Save search error:', error);
    }
  };

  // Apply saved search
  const handleApplySavedSearch = (search) => {
    try {
      const parsedFilters = JSON.parse(search.filters);
      setFilters(parsedFilters);
      setSortBy(search.sortBy || 'updated_at');
      setSortOrder(search.sortOrder || 'desc');

      // Set hasSearched to true when applying a saved search
      setHasSearched(true);

      toast.info(`Applied saved search: ${search.name}`);
    } catch (error) {
      toast.error('Failed to apply saved search');
      console.error('Apply saved search error:', error);
    }
  };

  // Delete saved search
  const handleDeleteSavedSearch = async (id) => {
    try {
      await deleteSavedSearch(id);
      queryClient.invalidateQueries(['saved-searches']);
      toast.success('Search deleted successfully');
    } catch (error) {
      toast.error('Failed to delete search');
      console.error('Delete saved search error:', error);
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Flatten equipment data from all pages
  const equipmentList = data?.pages.flatMap(page => page.equipment) || [];

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <Link to="/equipment/new" className="btn btn-primary">
          Add New Equipment
        </Link>
      </div>

      {/* Sticky Search Bar */}
      <div className="sticky top-16 z-20 bg-slate-50 pt-4 pb-2 shadow-sm">
        <div className="relative">
          <input
            id="search"
            name="search"
            placeholder="Search equipment by brand, model, serial number..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full px-4 py-3 pl-10 rounded-full shadow-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            aria-label="Search equipment catalog"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

          {/* Search suggestions */}
          {showSuggestions && suggestions?.equipment?.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-80 overflow-y-auto">
              {suggestions.equipment.map(item => (
                <Link
                  key={item.id}
                  to={`/equipment/${item.id}`}
                  className="block px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                >
                  <div className="font-medium">{item.brand} {item.model}</div>
                  <div className="text-sm text-slate-500">
                    {item.type} • SN: {item.serial_number}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle button */}
        <div className="flex justify-between mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-slate-600 hover:text-primary-600"
          >
            <FilterIcon className="w-4 h-4 mr-1" />
            {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
          </button>
        </div>
      </div>

      {/* Saved Searches (for admin/advanced users) */}
      {canEditEquipment() && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">Saved Searches</h2>

            {!showSaveSearchInput ? (
              <button
                className="flex items-center gap-1 px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                onClick={() => setShowSaveSearchInput(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Current Search</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  id="savedSearchName"
                  name="savedSearchName"
                  placeholder="Enter search name"
                  value={savedSearchName}
                  onChange={(e) => setSavedSearchName(e.target.value)}
                  className="w-48 px-3 py-1 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  onClick={handleSaveSearch}
                >
                  Save
                </button>
                <button
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                  onClick={() => {
                    setShowSaveSearchInput(false);
                    setSavedSearchName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap">
            {savedSearches?.searches?.length > 0 ? (
              savedSearches.searches.map(search => (
                <SavedSearchChip
                  key={search.id}
                  search={search}
                  onApply={handleApplySavedSearch}
                  onDelete={handleDeleteSavedSearch}
                />
              ))
            ) : (
              <p className="text-slate-500 text-sm">No saved searches yet. Save your current search to access it quickly later.</p>
            )}
          </div>
        </div>
      )}


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
  );
};

export default Dashboard;
