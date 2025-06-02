import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { getCategories } from '../services/categoryService';
import { DotsVerticalIcon, DuplicateIcon } from './Icons';
import Button from './ui/Button';

const BatchActionsContextMenu = ({
  selectedItems,
  onBatchDuplicate,
  onBatchStatusUpdate,
  onBatchLocationChange,
  onBatchTypeChange,
  onBatchCategoryChange,
  onBatchBrandModelChange,
  onClearSelection
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fetch data for dropdowns
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000, // 5 minutes
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 300000, // 5 minutes
  });

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleDuplicate = () => {
    setIsOpen(false);
    onBatchDuplicate();
  };

  const handleStatus = () => {
    setIsOpen(false);
    onBatchStatusUpdate();
  };

  const handleLocation = () => {
    setIsOpen(false);
    onBatchLocationChange();
  };

  const handleType = () => {
    setIsOpen(false);
    onBatchTypeChange();
  };

  const handleCategory = () => {
    setIsOpen(false);
    onBatchCategoryChange();
  };

  const handleBrandModel = () => {
    setIsOpen(false);
    onBatchBrandModelChange();
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center space-x-2 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
        <span className="text-xs font-medium text-blue-700">
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          className="text-xs py-0.5 px-2 bg-white"
        >
          Clear
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleMenu}
          className="flex items-center text-xs py-0.5 px-2 bg-white"
        >
          Actions <DotsVerticalIcon className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-md shadow-lg border border-slate-200 w-48">
          <div className="py-0.5">
            <button
              onClick={handleDuplicate}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <DuplicateIcon className="w-3.5 h-3.5 mr-1.5" />
              Duplicate
            </button>

            <button
              onClick={handleStatus}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">⟳</span>
              Update Status
            </button>

            <button
              onClick={handleLocation}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">📍</span>
              Change Location
            </button>

            <button
              onClick={handleType}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">🏷️</span>
              Change Type
            </button>

            <button
              onClick={handleCategory}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">📂</span>
              Change Category
            </button>

            <button
              onClick={handleBrandModel}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="w-3.5 h-3.5 mr-1.5 flex items-center justify-center">🔖</span>
              Update Brand/Model
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

BatchActionsContextMenu.propTypes = {
  selectedItems: PropTypes.array.isRequired,
  onBatchDuplicate: PropTypes.func.isRequired,
  onBatchStatusUpdate: PropTypes.func.isRequired,
  onBatchLocationChange: PropTypes.func.isRequired,
  onBatchTypeChange: PropTypes.func,
  onBatchCategoryChange: PropTypes.func,
  onBatchBrandModelChange: PropTypes.func,
  onClearSelection: PropTypes.func.isRequired
};

export default BatchActionsContextMenu;
