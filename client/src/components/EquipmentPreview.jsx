import React from 'react';
import { getFileUrl } from '../services/equipmentService';

const EquipmentPreview = ({ equipment, position }) => {
  // Use reference image if available, otherwise find the first image file
  let imageUrl = null;
  if (equipment.reference_image_id) {
    // Always prioritize the reference image
    imageUrl = getFileUrl(equipment.reference_image_id);
  } else if (equipment.files && equipment.files.length > 0) {
    // If no reference image, try to find the first image file
    const imageFile = equipment.files.find(file => file.file_type === 'image');
    if (imageFile) {
      imageUrl = getFileUrl(imageFile.id);
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

  // Calculate position for the preview
  const getPreviewStyle = () => {
    const style = {
      position: 'absolute',
      zIndex: 50,
      width: '300px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };

    if (position === 'right') {
      style.left = 'calc(100% + 10px)';
      style.top = '0';
    } else if (position === 'left') {
      style.right = 'calc(100% + 10px)';
      style.top = '0';
    } else if (position === 'top') {
      style.bottom = 'calc(100% + 10px)';
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    } else { // bottom (default)
      style.top = 'calc(100% + 10px)';
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    }

    return style;
  };

  return (
    <div
      className="bg-white rounded-lg overflow-hidden border border-slate-200"
      style={getPreviewStyle()}
    >
      <div className="h-40 bg-slate-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${equipment.brand} ${equipment.model}`}
            className="w-full h-full object-contain"
          />
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
        <p className="text-sm text-slate-500 mb-2">
          SN: {equipment.serial_number}
        </p>
        {equipment.location && (
          <p className="text-sm text-slate-500 mb-2">
            Location: {equipment.location}
          </p>
        )}
        {equipment.description && (
          <div className="mt-2 text-sm text-slate-600">
            <p className="line-clamp-2">{equipment.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentPreview;
