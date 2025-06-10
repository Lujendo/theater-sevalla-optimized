import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, Button } from './ui';
import { InfoIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

// Utility function to calculate missing quantity
const calculateMissingQuantity = (quantityNeeded, quantityAllocated) => {
  const needed = parseInt(quantityNeeded) || 0;
  const allocated = parseInt(quantityAllocated) || 0;
  return Math.max(0, needed - allocated);
};

const EquipmentAvailability = ({ equipmentId, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);

  const { data: availabilityData, isLoading, isError } = useQuery({
    queryKey: ['equipmentAvailability', equipmentId],
    queryFn: async () => {
      const response = await axios.get(`/api/inventory/equipment/${equipmentId}/availability`);
      return response.data;
    },
    enabled: !!equipmentId
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-slate-600">Loading availability...</p>
      </div>
    );
  }

  if (isError || !availabilityData) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Failed to load availability information</p>
      </div>
    );
  }

  // Handle new data structure from global availability endpoint
  const equipment = {
    type: availabilityData.type,
    brand: availabilityData.brand,
    model: availabilityData.model,
    status: availabilityData.equipment_status
  };

  const totalQuantity = availabilityData.total_quantity;
  const totalAllocated = parseInt(availabilityData.total_allocated) + parseInt(availabilityData.show_allocated);
  const available = availabilityData.available_quantity;
  const allocations = []; // TODO: Get detailed allocations from separate endpoint if needed

  const getAvailabilityColor = () => {
    if (available <= 0) return 'text-red-600';
    if (available <= totalQuantity * 0.2) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'requested': 'bg-blue-100 text-blue-800',
      'allocated': 'bg-yellow-100 text-yellow-800',
      'checked-out': 'bg-orange-100 text-orange-800',
      'in-use': 'bg-red-100 text-red-800',
      'returned': 'bg-green-100 text-green-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center">
            <InfoIcon className="w-5 h-5 mr-2" />
            Equipment Availability
          </h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Equipment Info */}
        <Card className="mb-4">
          <Card.Body>
            <h3 className="font-medium text-slate-800 mb-2">{equipment.type}</h3>
            <p className="text-sm text-slate-600 mb-3">
              {equipment.brand} {equipment.model}
            </p>
            
            {/* Availability Summary */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-slate-800">{totalQuantity}</div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{availabilityData.show_allocated}</div>
                <div className="text-xs text-slate-600">In Shows</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">{availabilityData.total_allocated}</div>
                <div className="text-xs text-slate-600">Inventory</div>
              </div>
              <div>
                <div className={`text-xl font-bold ${getAvailabilityColor()}`}>{available}</div>
                <div className="text-xs text-slate-600">Available</div>
              </div>
            </div>

            {/* Availability Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>Availability</span>
                <span>{Math.round((available / totalQuantity) * 100)}% available</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${available > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max((available / totalQuantity) * 100, 0)}%` }}
                ></div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Allocations Details */}
        {allocations.length > 0 && (
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">Current Allocations ({allocations.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center space-x-1"
                >
                  <span>{showDetails ? 'Hide' : 'Show'} Details</span>
                  {showDetails ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-3">
                  {allocations.map((allocation) => (
                    <div key={allocation.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-slate-800">{allocation.showName}</h5>
                          <p className="text-sm text-slate-600">
                            {new Date(allocation.showDate).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(allocation.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Needed:</span>
                          <span className="ml-2 font-medium">{allocation.quantityNeeded}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Allocated:</span>
                          <span className="ml-2 font-medium">{allocation.quantityAllocated}</span>
                        </div>
                      </div>

                      {/* Missing Quantity Display */}
                      {(() => {
                        const missing = calculateMissingQuantity(allocation.quantityNeeded, allocation.quantityAllocated);
                        return missing > 0 ? (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-red-600 font-medium">Missing Items:</span>
                              <span className="font-bold text-red-600">
                                {missing} item{missing !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {allocation.notes && (
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Notes:</span>
                          <p className="text-slate-800 mt-1">{allocation.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {allocations.length === 0 && (
          <Card>
            <Card.Body className="text-center py-8">
              <div className="text-slate-300 mb-2">📦</div>
              <p className="text-slate-600">No current allocations for this equipment</p>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EquipmentAvailability;
