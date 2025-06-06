import { useState, useRef, useEffect } from 'react';
import { ViewIcon, EditIcon, DuplicateIcon, CopyIcon, TrashIcon, DotsVerticalIcon } from './Icons';

const DropdownMenu = ({
  onView,
  onEdit,
  onDuplicate,
  onBatchDuplicate,
  onDelete,
  canDelete = false,
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle menu item click
  const handleMenuItemClick = (handler) => {
    setIsOpen(false);
    if (handler) handler();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 border border-slate-300"
        title="More options"
        style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
      >
        <DotsVerticalIcon className="w-5 h-5" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={`absolute z-10 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]`}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            onClick={() => handleMenuItemClick(onView)}
          >
            <ViewIcon className="w-4 h-4 mr-2 text-primary-600" />
            View Details
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            onClick={() => handleMenuItemClick(onEdit)}
          >
            <EditIcon className="w-4 h-4 mr-2 text-slate-600" />
            Edit
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            onClick={() => handleMenuItemClick(onDuplicate)}
          >
            <DuplicateIcon className="w-4 h-4 mr-2 text-green-600" />
            Duplicate
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            onClick={() => handleMenuItemClick(onBatchDuplicate)}
          >
            <CopyIcon className="w-4 h-4 mr-2 text-blue-600" />
            Batch Duplicate
          </button>

          {canDelete && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                onClick={() => handleMenuItemClick(onDelete)}
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
