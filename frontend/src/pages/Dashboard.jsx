import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEquipment, getFileUrl } from '../services/equipmentService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../services/savedSearchService';
import { getCategories } from '../services/categoryService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { debounce } from 'lodash';

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
  </svg>
);

// Equipment card component
const EquipmentCard = ({ equipment, canEdit, searchTerm }) => {
  const [showPreview, setShowPreview] = useState(false);

  // Use reference image if available, otherwise find the first image file
  let imageUrl = null;
  if (equipment.reference_image_id) {
    // Always prioritize the reference image
    // Use thumbnail for better performance in dashboard cards
    imageUrl = getFileUrl(equipment.reference_image_id, true);
  } else if (equipment.files && equipment.files.length > 0) {
    // If no reference image, try to find the first image file
    const imageFile = equipment.files.find(file => file.file_type === 'image');
    if (imageFile) {
      // Use thumbnail for better performance in dashboard cards
      imageUrl = getFileUrl(imageFile.id, true);
    }
  }

  // Status badge color
  const getStatusBadge = (status) => {
    switch(status) {
      case 'available':
        return <Badge variant="success">{status}</Badge>;
      case 'in-use':
        return <Badge variant="info">{status}</Badge>;
      case 'maintenance':
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Highlight search term in text
  const highlightText = (text, term) => {
    if (!term || !text) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-yellow-200 font-medium">{part}</span> : part
    );
  };

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative">
      <div
        className="relative h-40 bg-slate-100 rounded-t-lg overflow-hidden"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={imageUrl}
              alt={`${equipment.brand} ${equipment.model}`}
              className="w-full h-full object-contain"
              style={{
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-200">
            <span className="text-slate-400 text-lg">No image</span>
          </div>
        )}

        {/* Preview tooltip */}
        {showPreview && (
          <div className="absolute inset-0 bg-slate-900 bg-opacity-80 p-4 text-white overflow-y-auto">
            <h4 className="font-medium">{equipment.brand} {equipment.model}</h4>
            <p className="text-sm mt-1">{equipment.description || 'No description available'}</p>
            <p className="text-sm mt-2">Serial: {equipment.serial_number}</p>
            <p className="text-sm">Location: {equipment.location || 'Not specified'}</p>
          </div>
        )}
      </div>

      <Card.Body>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-slate-800 capitalize">{equipment.type}</h3>
            {equipment.category && (
              <p className="text-xs text-slate-500">Category: {equipment.category}</p>
            )}
          </div>
          {getStatusBadge(equipment.status)}
        </div>
        <h2 className="text-lg font-semibold mb-1">
          {searchTerm ? (
            <>
              {highlightText(equipment.brand, searchTerm)}{' '}
              {highlightText(equipment.model, searchTerm)}
            </>
          ) : (
            `${equipment.brand} ${equipment.model}`
          )}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          SN: {searchTerm ? highlightText(equipment.serial_number, searchTerm) : equipment.serial_number}
        </p>

        <div className="flex justify-between mt-auto pt-2 border-t border-slate-100">
          <Link
            to={`/equipment/${equipment.id}`}
            className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            <ViewIcon /> View
          </Link>

          {canEdit && (
            <Link
              to={`/equipment/${equipment.id}/edit`}
              className="text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <EditIcon /> Edit
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// Skeleton loader for equipment cards
const EquipmentCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-soft overflow-hidden h-full animate-pulse">
    <div className="h-40 bg-slate-200"></div>
    <div className="p-4">
      <div className="flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
      </div>
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
      <div className="border-t border-slate-100 pt-2 flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

// Saved search chip component
const SavedSearchChip = ({ search, onApply, onDelete }) => (
  <div className="inline-flex items-center bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm mr-2 mb-2">
    <button
      onClick={() => onApply(search)}
      className="mr-1 hover:text-primary-900"
      aria-label={`Apply saved search: ${search.name}`}
    >
      {search.name}
    </button>
    <button
      onClick={() => onDelete(search.id)}
      className="ml-1 text-primary-400 hover:text-primary-700"
      aria-label={`Delete saved search: ${search.name}`}
    >
      <CloseIcon className="w-4 h-4" />
    </button>
  </div>
);

// Main Dashboard component
const AdvancedDashboard = () => {
  const { user, canEditEquipment } = useAuth();
  const queryClient = useQueryClient();
  const observerTarget = useRef(null);

  // State for filters and search
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
    status: '',
    location: '',
    dateRange: {
      startDate: null,
      endDate: null
    }
  });

  // State for search suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // State for filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  // State for sorting
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // State for saved search name
  const [savedSearchName, setSavedSearchName] = useState('');
  const [showSaveSearchInput, setShowSaveSearchInput] = useState(false);

  // Fetch equipment with infinite query
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

  // Fetch equipment types for filter
  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: getEquipmentTypes
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
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
    setFilters(prev => ({ ...prev, search: value }));
    debouncedSearch(value);

    if (value.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setFilters(prev => ({
      ...prev,
      dateRange: {
        startDate: start,
        endDate: end
      }
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category: '',
      status: '',
      location: '',
      dateRange: {
        startDate: null,
        endDate: null
      }
    });
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
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

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [observerTarget, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Flatten equipment data from all pages
  const equipmentList = data?.pages.flatMap(page => page.equipment) || [];

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Equipment Dashboard</h1>
      </div>

      {/* Sticky Search Bar */}
      <div className="sticky top-16 z-20 bg-slate-50 pt-4 pb-2 shadow-sm">
        <div className="relative">
          <Input
            id="search"
            name="search"
            placeholder="Search equipment by brand, model, serial number..."
            value={filters.search}
            onChange={handleSearchChange}
            icon={<SearchIcon />}
            className="rounded-full shadow-md"
            aria-label="Search equipment catalog"
          />

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

          {/* Filter toggle button */}
          <div className="flex mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <FilterIcon />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </Button>

            {Object.values(filters).some(val =>
              val && (typeof val === 'string' ? val.trim() !== '' : true)
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-slate-600"
              >
                <ClearIcon />
                <span>Clear Filters</span>
              </Button>
            )}

            {/* Sort dropdown */}
            <div className="ml-auto">
              <Select
                id="sort"
                name="sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                options={[
                  { value: 'updated_at-desc', label: 'Newest First' },
                  { value: 'updated_at-asc', label: 'Oldest First' },
                  { value: 'brand-asc', label: 'Brand (A-Z)' },
                  { value: 'brand-desc', label: 'Brand (Z-A)' },
                  { value: 'model-asc', label: 'Model (A-Z)' },
                  { value: 'model-desc', label: 'Model (Z-A)' },
                ]}
                className="w-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Saved Searches (for admin/advanced users) */}
      {canEditEquipment() && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">Saved Searches</h2>

            {!showSaveSearchInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveSearchInput(true)}
                className="flex items-center gap-1"
              >
                <SaveIcon />
                <span>Save Current Search</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="savedSearchName"
                  name="savedSearchName"
                  placeholder="Enter search name"
                  value={savedSearchName}
                  onChange={(e) => setSavedSearchName(e.target.value)}
                  className="w-48"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSearch}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSaveSearchInput(false);
                    setSavedSearchName('');
                  }}
                >
                  Cancel
                </Button>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category filter */}
            <Select
              id="category"
              name="category"
              label="Category"
              value={filters.category}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Categories' },
                ...(categories || []).map(category => ({
                  value: category.name,
                  label: category.name
                }))
              ]}
            />

            {/* Type filter */}
            <Select
              id="type"
              name="type"
              label="Equipment Type"
              value={filters.type}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Types' },
                ...(equipmentTypes || []).map(type => ({
                  value: type.name,
                  label: type.name
                }))
              ]}
            />

            {/* Status filter */}
            <Select
              id="status"
              name="status"
              label="Status"
              value={filters.status}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'available', label: 'Available' },
                { value: 'in-use', label: 'In Use' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />

            {/* Location filter */}
            <Input
              id="location"
              name="location"
              label="Location"
              placeholder="Filter by location"
              value={filters.location}
              onChange={handleFilterChange}
            />

            {/* Date range filter */}
            <div className="md:col-span-3">
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
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <EquipmentCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading equipment</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error?.message || 'Failed to load equipment data. Please try again.'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : equipmentList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-800">No equipment found</h3>
            <p className="mt-2 text-slate-500">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipmentList.map(equipment => (
                <EquipmentCard
                  key={equipment.id}
                  equipment={equipment}
                  canEdit={canEditEquipment()}
                  searchTerm={filters.search}
                />
              ))}
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
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedDashboard;
