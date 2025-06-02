import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { DotsVerticalIcon, ViewIcon, EditIcon, DuplicateIcon, TrashIcon } from './Icons';

const BatchActionsMenu = ({
  onBatchDuplicate,
  onBatchStatusUpdate,
  onBatchLocationChange,
  equipmentId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

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

  const handleView = () => {
    setIsOpen(false);
    navigate(`/equipment/${equipmentId}`);
  };

  const handleEdit = () => {
    setIsOpen(false);
    navigate(`/equipment/${equipmentId}/edit`);
  };

  const handleDuplicate = () => {
    setIsOpen(false);
    onBatchDuplicate(equipmentId);
  };

  const handleStatus = () => {
    setIsOpen(false);
    if (onBatchStatusUpdate) {
      onBatchStatusUpdate(equipmentId);
    }
  };

  const handleLocation = () => {
    setIsOpen(false);
    if (onBatchLocationChange) {
      onBatchLocationChange(equipmentId);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="p-1 rounded-md hover:bg-slate-100 border border-slate-200"
        title="Actions"
        aria-label="Actions menu"
      >
        <DotsVerticalIcon className="w-4 h-4 text-slate-600" />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="py-0.5">
            <button
              onClick={handleView}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <ViewIcon className="w-3.5 h-3.5 mr-1.5" />
              View Details
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <EditIcon className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </button>
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
          </div>
        </div>
      )}
    </div>
  );
};

BatchActionsMenu.propTypes = {
  onBatchDuplicate: PropTypes.func.isRequired,
  onBatchStatusUpdate: PropTypes.func,
  onBatchLocationChange: PropTypes.func,
  equipmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default BatchActionsMenu;
