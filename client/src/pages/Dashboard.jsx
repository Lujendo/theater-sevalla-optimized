import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getCategories } from '../services/categoryService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../services/savedSearchService';
import { Card, Button, Input, Select, Badge } from '../components/ui';
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

// Import SavedSearchChip component
import SavedSearchChip from '../components/SavedSearchChip';

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

// Analytics Summary Component
const AnalyticsSummary = ({ equipmentData, onFilterChange, currentFilters, isLoading }) => {
  // Calculate analytics from equipment data
  const calculateAnalytics = () => {
    if (!equipmentData || equipmentData.length === 0) {
      return {
        total: 0,
        available: 0,
        inUse: 0,
        maintenance: 0,
        categories: {},
        types: {},
        locations: {},
        brands: {},
        recentlyAdded: 0
      };
    }

    const analytics = {
      total: equipmentData.length,
      available: 0,
      inUse: 0,
      maintenance: 0,
      categories: {},
      types: {},
      locations: {},
      brands: {},
      recentlyAdded: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    equipmentData.forEach(item => {
      // Count by status
      if (item.status === 'available') analytics.available++;
      else if (item.status === 'in-use') analytics.inUse++;
      else if (item.status === 'maintenance') analytics.maintenance++;

      // Count by category
      const category = item.category || 'Uncategorized';
      analytics.categories[category] = (analytics.categories[category] || 0) + 1;

      // Count by type
      const type = item.type || 'Unknown';
      analytics.types[type] = (analytics.types[type] || 0) + 1;

      // Count by location
      const location = item.location || 'No Location';
      analytics.locations[location] = (analytics.locations[location] || 0) + 1;

      // Count by brand
      const brand = item.brand || 'Unknown';
      analytics.brands[brand] = (analytics.brands[brand] || 0) + 1;

      // Count recently added (last 7 days)
      if (new Date(item.created_at) > oneWeekAgo) {
        analytics.recentlyAdded++;
      }
    });

    return analytics;
  };

  const analytics = calculateAnalytics();

  // Status cards data
  const statusCards = [
    {
      title: 'Total Equipment',
      value: analytics.total,
      icon: <ChartBarIcon />,
      color: 'blue',
      filter: { status: '' },
      description: 'All equipment in system'
    },
    {
      title: 'Available',
      value: analytics.available,
      icon: <TrendingUpIcon />,
      color: 'green',
      filter: { status: 'available' },
      description: 'Ready for use'
    },
    {
      title: 'In Use',
      value: analytics.inUse,
      icon: <TrendingUpIcon />,
      color: 'yellow',
      filter: { status: 'in-use' },
      description: 'Currently deployed'
    },
    {
      title: 'Maintenance',
      value: analytics.maintenance,
      icon: <TrendingUpIcon />,
      color: 'red',
      filter: { status: 'maintenance' },
      description: 'Under repair'
    }
  ];

  // Get color classes for different variants
  const getColorClasses = (color, isActive = false) => {
    const colors = {
      blue: {
        bg: isActive ? 'bg-blue-100 border-blue-500' : 'bg-blue-50 hover:bg-blue-100',
        text: 'text-blue-700',
        border: 'border-l-4 border-blue-500',
        icon: 'text-blue-600'
      },
      green: {
        bg: isActive ? 'bg-green-100 border-green-500' : 'bg-green-50 hover:bg-green-100',
        text: 'text-green-700',
        border: 'border-l-4 border-green-500',
        icon: 'text-green-600'
      },
      yellow: {
        bg: isActive ? 'bg-yellow-100 border-yellow-500' : 'bg-yellow-50 hover:bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-l-4 border-yellow-500',
        icon: 'text-yellow-600'
      },
      red: {
        bg: isActive ? 'bg-red-100 border-red-500' : 'bg-red-50 hover:bg-red-100',
        text: 'text-red-700',
        border: 'border-l-4 border-red-500',
        icon: 'text-red-600'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ChartBarIcon />
          Equipment Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((card, index) => {
            const isActive = currentFilters.status === card.filter.status;
            const colorClasses = getColorClasses(card.color, isActive);

            return (
              <button
                key={index}
                onClick={() => onFilterChange(card.filter)}
                className={`${colorClasses.bg} ${colorClasses.border} p-4 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer text-left group ${
                  isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                title={`Filter by ${card.title.toLowerCase()}: ${card.description}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-medium ${colorClasses.text} mb-1`}>
                      {card.title}
                    </h3>
                    <p className={`text-2xl font-bold ${colorClasses.text}`}>
                      {isLoading ? '...' : card.value.toLocaleString()}
                    </p>
                    <p className={`text-xs ${colorClasses.text} opacity-75 mt-1`}>
                      {card.description}
                    </p>
                  </div>
                  <div className={`${colorClasses.icon} group-hover:scale-110 transition-transform`}>
                    {card.icon}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.brands).length}
            </p>
            <p className="text-sm text-primary-600">Brands</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.types).length}
            </p>
            <p className="text-sm text-primary-600">Types</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.locations).length}
            </p>
            <p className="text-sm text-primary-600">Locations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">
              {analytics.recentlyAdded}
            </p>
            <p className="text-sm text-green-600">Added This Week</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Advanced Dashboard with Analytics and Filtering - v4 FINAL
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
  const [showFilters, setShowFilters] = useState(false);

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

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // Fetch all equipment for analytics (without pagination)
  const { data: allEquipmentData } = useQuery(
    ['equipment-analytics'],
    () => getEquipment({ limit: 10000 }), // Get all equipment for analytics
    {
      keepPreviousData: true,
    }
  );

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

  // Handle analytics filter changes
  const handleAnalyticsFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // Set hasSearched to true when filtering from analytics
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

      {/* Filter Panel */}
      <div
        id="filter-panel"
        className={`bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden transition-all duration-300 ${
          showFilters ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'
        }`}
      >
        <div className="p-4">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Advanced Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Type filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Equipment Type
              </label>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
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

            {/* Brand filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={filters.brand}
                onChange={handleFilterChange}
                placeholder="Filter by brand"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="in-use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Location filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="Filter by location"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>

            {/* Date range filter */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date Range
              </label>
              <DatePicker
                selectsRange={true}
                startDate={filters.dateRange.startDate}
                endDate={filters.dateRange.endDate}
                onChange={handleDateRangeChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
                placeholderText="Select date range"
                isClearable
              />
            </div>

            {/* Sort options */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="updated_at">Last Updated</option>
                <option value="brand">Brand</option>
                <option value="model">Model</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
                <option value="location">Location</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}


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
              Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-20 bg-blue-50">
                    📷 Image
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-slate-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-red-500">
                      Error loading equipment: {error.message}
                    </td>
                  </tr>
                ) : equipmentList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-slate-500">
                      No equipment found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  equipmentList.map((item) => {
                    // Debug: Log equipment data to see what we're getting
                    console.log('🔍 Dashboard Equipment Item:', {
                      id: item.id,
                      brand: item.brand,
                      model: item.model,
                      reference_image_id: item.reference_image_id,
                      files: item.files,
                      hasFiles: item.files ? item.files.length : 0
                    });

                    // Get image URL for thumbnail
                    let imageUrl = null;
                    if (item.reference_image_id) {
                      imageUrl = `/api/files/${item.reference_image_id}?thumbnail=true`;
                      console.log('🖼️ Using reference image:', imageUrl);
                    } else if (item.files && item.files.length > 0) {
                      const imageFile = item.files.find(file => file.file_type === 'image');
                      if (imageFile) {
                        imageUrl = `/api/files/${imageFile.id}?thumbnail=true`;
                        console.log('🖼️ Using file image:', imageUrl);
                      }
                    }

                    if (!imageUrl) {
                      console.log('❌ No image found for equipment:', item.id);
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`${item.brand} ${item.model}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Error loading thumbnail for equipment ID:', item.id);
                                  // Show placeholder on error
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.brand}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.serial_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'available'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'in-use'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div className="flex space-x-2">
                            <Link
                              to={`/equipment/${item.id}`}
                              className="text-primary-600 hover:text-primary-900"
                              title="View details"
                            >
                              <ViewIcon className="w-5 h-5" />
                            </Link>
                            {canEditEquipment() && (
                              <>
                                <Link
                                  to={`/equipment/${item.id}/edit`}
                                  className="text-slate-600 hover:text-slate-900"
                                  title="Edit equipment"
                                >
                                  <EditIcon className="w-5 h-5" />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
        // Show analytics summary when no search is performed
        <div className="grid grid-cols-1 gap-6">
          <AnalyticsSummary
            equipmentData={allEquipmentData?.equipment || []}
            onFilterChange={handleAnalyticsFilterChange}
            currentFilters={filters}
            isLoading={isLoadingSummary}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
