import { useEffect, useRef } from 'react';
import { ViewIcon, EditIcon, DuplicateIcon, CopyIcon, TrashIcon } from './Icons';

const ContextMenu = ({ 
  x, 
  y, 
  onClose, 
  onView, 
  onEdit, 
  onDuplicate, 
  onBatchDuplicate, 
  onDelete,
  canDelete = false
}) => {
  const menuRef = useRef(null);

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = () => {
    if (!menuRef.current) return { top: y, left: x };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if menu would go off-screen
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position if menu would go off-screen
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }

    return { top: adjustedY, left: adjustedX };
  };

  const position = adjustedPosition();

  return (
    <div 
      ref={menuRef}
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
      style={{ top: position.top, left: position.left }}
    >
      <button 
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onView}
      >
        <ViewIcon className="w-4 h-4 mr-2 text-primary-600" />
        View Details
      </button>
      
      <button 
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onEdit}
      >
        <EditIcon className="w-4 h-4 mr-2 text-slate-600" />
        Edit
      </button>
      
      <button 
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onDuplicate}
      >
        <DuplicateIcon className="w-4 h-4 mr-2 text-green-600" />
        Duplicate
      </button>
      
      <button 
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onBatchDuplicate}
      >
        <CopyIcon className="w-4 h-4 mr-2 text-blue-600" />
        Batch Duplicate
      </button>
      
      {canDelete && (
        <>
          <div className="border-t border-gray-200 my-1"></div>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
            onClick={onDelete}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </button>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
