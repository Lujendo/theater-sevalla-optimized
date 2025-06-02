import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { getFileUrl } from '../services/equipmentService';
import { EditIcon, DuplicateIcon } from './Icons';
import { useAuth } from '../context/AuthContext';
import BatchActionsMenu from './BatchActionsMenu';

const EquipmentCardView = ({ equipment, onDuplicate, onSelect, isSelected }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);

  // Use reference image if available, otherwise find the first image file
  let imageUrl = null;
  if (equipment.reference_image_id) {
    // Always prioritize the reference image
    // Use thumbnail for better performance in card view
    imageUrl = getFileUrl(equipment.reference_image_id, true);
  } else if (equipment.files && equipment.files.length > 0) {
    // If no reference image, try to find the first image file
    const imageFile = equipment.files.find(file => file.file_type === 'image');
    if (imageFile) {
      // Use thumbnail for better performance in card view
      imageUrl = getFileUrl(imageFile.id, true);
    }
  }

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'available':
        return 'badge-success';
      case 'in-use':
        return 'badge-info';
      case 'maintenance':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  // Handle card click to navigate to equipment details
  const handleCardClick = (event) => {
    // Prevent navigation if clicking on a checkbox, button, or link
    if (
      event.target.type === 'checkbox' ||
      event.target.closest('button') ||
      event.target.closest('a') ||
      event.target.closest('.btn-icon')
    ) {
      return;
    }

    navigate(`/equipment/${equipment.id}`);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-soft overflow-hidden h-full ${isSelected ? 'bg-blue-50 border-2 border-blue-300' : ''} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handleCardClick}
    >
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect && onSelect(equipment.id)}
          className="h-4 w-4 text-primary-600 border-gray-300 rounded"
        />
      </div>
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
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-slate-800 capitalize">{equipment.type}</h3>
            {equipment.category && (
              <p className="text-xs text-slate-500">Category: {equipment.category}</p>
            )}
          </div>
          <span className={`badge ${getStatusBadgeClass(equipment.status)}`}>
            {equipment.status}
          </span>
        </div>
        <h2 className="text-lg font-semibold mb-1">
          {equipment.brand} {equipment.model}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          SN: {equipment.serial_number}
        </p>
        {equipment.location && (
          <p className="text-sm text-slate-500 mb-2">
            Location: {equipment.location}
          </p>
        )}

        <div className="flex justify-between mt-auto pt-2 border-t border-slate-100">
          <Link
            to={`/equipment/${equipment.id}/edit`}
            className="btn-icon text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            title="Edit equipment"
          >
            <EditIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={() => onDuplicate(equipment.id)}
            className="btn-icon text-green-600 hover:text-green-800 hover:bg-green-50"
            title="Duplicate equipment"
          >
            <DuplicateIcon className="w-5 h-5" />
          </button>
          <BatchActionsMenu
            equipmentId={equipment.id}
            onBatchDuplicate={() => {
              // We need to pass the batch duplicate action up to the parent component
              // This is because the batch duplicate modal is in the EquipmentList component
              const event = new CustomEvent('batchDuplicate', { detail: { id: equipment.id } });
              document.dispatchEvent(event);
            }}
            onBatchStatusUpdate={() => {
              const event = new CustomEvent('batchStatusUpdate', { detail: { id: equipment.id } });
              document.dispatchEvent(event);
            }}
            onBatchLocationChange={() => {
              const event = new CustomEvent('batchLocationChange', { detail: { id: equipment.id } });
              document.dispatchEvent(event);
            }}
          />
        </div>
      </div>
    </div>
  );
};

EquipmentCardView.propTypes = {
  equipment: PropTypes.object.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool
};

export default EquipmentCardView;
