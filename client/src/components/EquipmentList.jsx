import { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import {
  SearchIcon,
  FilterIcon,
  AddIcon,
  ImportIcon,
  ExportIcon,
} from './Icons';
import DuplicateEquipmentModal from './DuplicateEquipmentModal';
import BatchDuplicateModal from './BatchDuplicateModal';
import BatchStatusUpdateModal from './BatchStatusUpdateModal';
import BatchLocationChangeModal from './BatchLocationChangeModal';
import BatchTypeUpdateModal from './BatchTypeUpdateModal';
import BatchCategoryUpdateModal from './BatchCategoryUpdateModal';
import BatchBrandModelUpdateModal from './BatchBrandModelUpdateModal';
import BatchActionsMenu from './BatchActionsMenu';
import BatchActionsContextMenu from './BatchActionsContextMenu';
import EquipmentCardView from './EquipmentCardView';
import SortableHeader from './SortableHeader';
import ImportExportModal from './ImportExportModal';

const EquipmentList = () => {
  const navigate = useNavigate();
  const observerTarget = useRef(null);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({
    type: '',
    brand: '',
    status: '',
    location_id: '',
    search: '',
  });

  // Selection state for batch operations
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // View mode state (list or card)
  const [viewMode, setViewMode] = useState('list'); // Default to list view

  // Thumbnail display state for list view - disabled for now
  const [showThumbnails, setShowThumbnails] = useState(false);

  // No hover preview state needed

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('equipmentViewMode');
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }

    const savedShowThumbnails = localStorage.getItem('equipmentShowThumbnails');
    if (savedShowThumbnails !== null) {
      setShowThumbnails(savedShowThumbnails === 'true');
    }
  }, []);

  // Save view preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('equipmentViewMode', viewMode);
  }, [viewMode]);

  // Save thumbnail preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('equipmentShowThumbnails', showThumbnails.toString());
  }, [showThumbnails]);

  // State for modals
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isBatchDuplicateModalOpen, setIsBatchDuplicateModalOpen] = useState(false);
  const [isBatchStatusModalOpen, setIsBatchStatusModalOpen] = useState(false);
  const [isBatchLocationModalOpen, setIsBatchLocationModalOpen] = useState(false);
  const [isBatchTypeModalOpen, setIsBatchTypeModalOpen] = useState(false);
  const [isBatchCategoryModalOpen, setIsBatchCategoryModalOpen] = useState(false);
  const [isBatchBrandModelModalOpen, setIsBatchBrandModelModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);

  // Listen for batch action events from EquipmentCardView
  useEffect(() => {
    const handleBatchDuplicate = (event) => {
      const { id } = event.detail;
      setSelectedEquipmentId(id);
      setIsBatchDuplicateModalOpen(true);
    };

    const handleBatchStatusUpdate = (event) => {
      const { id } = event.detail;
      setSelectedEquipmentId(id);
      setIsBatchStatusModalOpen(true);
    };

    const handleBatchLocationChange = (event) => {
      const { id } = event.detail;
      setSelectedEquipmentId(id);
      setIsBatchLocationModalOpen(true);
    };

    document.addEventListener('batchDuplicate', handleBatchDuplicate);
    document.addEventListener('batchStatusUpdate', handleBatchStatusUpdate);
    document.addEventListener('batchLocationChange', handleBatchLocationChange);

    return () => {
      document.removeEventListener('batchDuplicate', handleBatchDuplicate);
      document.removeEventListener('batchStatusUpdate', handleBatchStatusUpdate);
      document.removeEventListener('batchLocationChange', handleBatchLocationChange);
    };
  }, []);

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
        limit,
        ...filters,
        sortBy,
        sortOrder
      };
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

  // Flatten equipment data from all pages
  const equipmentList = data?.pages.flatMap(page => page.equipment) || [];

  // Set up infinite scroll
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

  // Handle duplicate button click
  const handleDuplicateClick = (id) => {
    setSelectedEquipmentId(id);
    setIsDuplicateModalOpen(true);
  };

  // Close duplicate modal
  const handleCloseModal = () => {
    setIsDuplicateModalOpen(false);
    setSelectedEquipmentId(null);
  };

  // Close batch duplicate modal
  const handleCloseBatchModal = () => {
    setIsBatchDuplicateModalOpen(false);
    setSelectedEquipmentId(null);
  };



  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Search is already applied via the filters state
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

  // No hover preview handlers needed

  // Handle item selection for batch operations
  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all items
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      const allIds = equipmentList.map(item => item.id);
      setSelectedItems(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedItems([]);
    setSelectAll(false);
  };

  // Handle row click to navigate to equipment details
  const handleRowClick = (id, event) => {
    // Prevent navigation if clicking on a checkbox, button, or link
    if (
      event.target.type === 'checkbox' ||
      event.target.closest('button') ||
      event.target.closest('a') ||
      event.target.closest('.btn-icon')
    ) {
      return;
    }

    navigate(`/equipment/${id}`);
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="text-center py-10 text-red-600">
        Error: {error.message || 'Failed to load equipment'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Duplicate Modal */}
      <DuplicateEquipmentModal
        isOpen={isDuplicateModalOpen}
        onClose={handleCloseModal}
        equipmentId={selectedEquipmentId}
      />

      {/* Batch Duplicate Modal */}
      <BatchDuplicateModal
        isOpen={isBatchDuplicateModalOpen}
        onClose={handleCloseBatchModal}
        equipmentId={selectedEquipmentId}
        selectedItems={selectedItems}
      />

      {/* Batch Status Update Modal */}
      <BatchStatusUpdateModal
        isOpen={isBatchStatusModalOpen}
        onClose={() => setIsBatchStatusModalOpen(false)}
        equipmentId={selectedEquipmentId}
        selectedItems={selectedItems}
      />

      {/* Batch Location Change Modal */}
      <BatchLocationChangeModal
        isOpen={isBatchLocationModalOpen}
        onClose={() => setIsBatchLocationModalOpen(false)}
        equipmentId={selectedEquipmentId}
        selectedItems={selectedItems}
      />

      {/* Batch Type Update Modal */}
      <BatchTypeUpdateModal
        isOpen={isBatchTypeModalOpen}
        onClose={() => setIsBatchTypeModalOpen(false)}
        selectedItems={selectedItems}
      />

      {/* Batch Category Update Modal */}
      <BatchCategoryUpdateModal
        isOpen={isBatchCategoryModalOpen}
        onClose={() => setIsBatchCategoryModalOpen(false)}
        selectedItems={selectedItems}
      />

      {/* Batch Brand/Model Update Modal */}
      <BatchBrandModelUpdateModal
        isOpen={isBatchBrandModelModalOpen}
        onClose={() => setIsBatchBrandModelModalOpen(false)}
        selectedItems={selectedItems}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        filters={filters}
        selectedItems={selectedItems}
      />

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
                placeholder="Search equipment..."
                className="input input-with-icon"
              />
            </div>
          </div>

          <div>
            <label htmlFor="type" className="label">Type</label>
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
            <label htmlFor="status" className="label">Status</label>
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

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFilters({
                  type: '',
                  brand: '',
                  status: '',
                  location_id: '',
                  search: '',
                });
              }}
              className="btn btn-outline w-full"
            >
              Clear All Filters
            </button>
          </div>

          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              <FilterIcon className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Equipment List/Grid */}

      <div className="card">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-slate-800 mr-4">Equipment List</h2>

              {/* View toggle buttons */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden mr-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 text-xs font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-primary-600 border-r border-slate-200 hover:bg-primary-50'
                      : 'bg-white text-slate-600 border-r border-slate-200 hover:bg-slate-50'
                  }`}
                  title="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-2 py-1 text-xs font-medium transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Card view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>

              {/* Batch Actions Menu - Only shown when items are selected */}
              {selectedItems.length > 0 && (
                <div className="ml-2">
                  <BatchActionsContextMenu
                    selectedItems={selectedItems}
                    onBatchDuplicate={() => setIsBatchDuplicateModalOpen(true)}
                    onBatchStatusUpdate={() => setIsBatchStatusModalOpen(true)}
                    onBatchLocationChange={() => setIsBatchLocationModalOpen(true)}
                    onBatchTypeChange={() => setIsBatchTypeModalOpen(true)}
                    onBatchCategoryChange={() => setIsBatchCategoryModalOpen(true)}
                    onBatchBrandModelChange={() => setIsBatchBrandModelModalOpen(true)}
                    onClearSelection={clearSelections}
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setIsImportExportModalOpen(true)}
                className="btn btn-secondary btn-sm"
              >
                <div className="flex items-center">
                  <ImportIcon className="w-4 h-4 mr-1" />
                  <ExportIcon className="w-4 h-4 mr-1" />
                  <span>Import/Export</span>
                </div>
              </button>
              <Link to="/equipment/new" className="btn btn-primary btn-sm">
                <AddIcon className="w-4 h-4" />
                <span>Add New Equipment</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipmentList.length > 0 ? (
              equipmentList.map((item) => (
                <EquipmentCardView
                  key={item.id}
                  equipment={item}
                  onDuplicate={handleDuplicateClick}
                  onSelect={handleSelectItem}
                  isSelected={selectedItems.includes(item.id)}
                />
              ))
            ) : (
              <div className="col-span-3 py-8 text-center text-gray-500">
                No equipment found
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-10">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                    </div>
                  </th>
                  {/* Thumbnail column removed */}
                  <SortableHeader
                    field="type"
                    label="Type"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="category"
                    label="Category"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="brand"
                    label="Brand"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="model"
                    label="Model"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="serial_number"
                    label="Serial Number"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="status"
                    label="Status"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <SortableHeader
                    field="location"
                    label="Location"
                    currentSortField={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSortChange}
                  />
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {equipmentList.length > 0 ? (
                  equipmentList.map((item) => (
                    <tr
                      key={item.id}
                      className={`table-row ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''} cursor-pointer hover:bg-slate-50`}
                      onClick={(e) => handleRowClick(item.id, e)}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                          />
                        </div>
                      </td>
                      {/* Thumbnail cell removed */}
                      <td className="table-cell">
                        {item.type}
                      </td>
                      <td className="table-cell">
                        {item.category || '-'}
                      </td>
                      <td className="table-cell">{item.brand}</td>
                      <td className="table-cell">{item.model}</td>
                      <td className="table-cell">{item.serial_number}</td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            item.status === 'available'
                              ? 'badge-success'
                              : item.status === 'in-use'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="table-cell">{item.locationDetails?.name || item.location || '-'}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end">
                          <BatchActionsMenu
                            equipmentId={item.id}
                            onBatchDuplicate={() => {
                              setSelectedEquipmentId(item.id);
                              setIsBatchDuplicateModalOpen(true);
                            }}
                            onBatchStatusUpdate={() => {
                              setSelectedEquipmentId(item.id);
                              setIsBatchStatusModalOpen(true);
                            }}
                            onBatchLocationChange={() => {
                              setSelectedEquipmentId(item.id);
                              setIsBatchLocationModalOpen(true);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                      No equipment found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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

    </div>
  );
};

export default EquipmentList;
