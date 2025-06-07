import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card, Button, Input } from '../components/ui';
import { ChevronLeftIcon, AddIcon, TrashIcon, ListViewIcon, CardViewIcon } from '../components/Icons';
import { getShow, getShowEquipment, addEquipmentToShow, updateShowEquipment, removeEquipmentFromShow, checkoutEquipment, returnEquipment } from '../services/showService';
import { getEquipment } from '../services/equipmentService';

const ManageEquipment = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch show details
  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => getShow(showId),
    onError: (error) => {
      toast.error(`Failed to load show: ${error.message}`);
    }
  });

  // Fetch show equipment
  const { data: showEquipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['showEquipment', showId],
    queryFn: () => getShowEquipment(showId),
    onError: (error) => {
      toast.error(`Failed to load show equipment: ${error.message}`);
    }
  });

  // Fetch available equipment for adding
  const { data: availableEquipmentData } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => getEquipment({ status: 'available' }),
    enabled: showAddModal
  });

  const showEquipment = showEquipmentData?.equipment || [];
  const availableEquipment = availableEquipmentData?.equipment || [];

  // Add equipment mutation
  const addEquipmentMutation = useMutation({
    mutationFn: (data) => addEquipmentToShow(showId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['show', showId]);
      toast.success('Equipment added to show');
      setShowAddModal(false);
      setSelectedEquipment(null);
      setQuantityNeeded(1);
      setNotes('');
    },
    onError: (error) => {
      toast.error(`Failed to add equipment: ${error.message}`);
    }
  });

  // Update equipment mutation
  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateShowEquipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      toast.success('Equipment updated');
    },
    onError: (error) => {
      toast.error(`Failed to update equipment: ${error.message}`);
    }
  });

  // Remove equipment mutation
  const removeEquipmentMutation = useMutation({
    mutationFn: removeEquipmentFromShow,
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['show', showId]);
      toast.success('Equipment removed from show');
    },
    onError: (error) => {
      toast.error(`Failed to remove equipment: ${error.message}`);
    }
  });

  // Checkout equipment mutation
  const checkoutMutation = useMutation({
    mutationFn: checkoutEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      toast.success('Equipment checked out');
    },
    onError: (error) => {
      toast.error(`Failed to checkout equipment: ${error.message}`);
    }
  });

  // Return equipment mutation
  const returnMutation = useMutation({
    mutationFn: returnEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      toast.success('Equipment returned');
    },
    onError: (error) => {
      toast.error(`Failed to return equipment: ${error.message}`);
    }
  });

  const handleAddEquipment = () => {
    if (selectedEquipment && quantityNeeded > 0) {
      addEquipmentMutation.mutate({
        equipmentId: selectedEquipment.id,
        quantityNeeded,
        notes
      });
    }
  };

  const handleRemoveEquipment = (equipmentId) => {
    if (window.confirm('Are you sure you want to remove this equipment from the show?')) {
      removeEquipmentMutation.mutate(equipmentId);
    }
  };

  const handleCheckout = (equipmentId) => {
    checkoutMutation.mutate(equipmentId);
  };

  const handleReturn = (equipmentId) => {
    returnMutation.mutate(equipmentId);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'requested': 'bg-yellow-100 text-yellow-800',
      'allocated': 'bg-blue-100 text-blue-800',
      'checked-out': 'bg-orange-100 text-orange-800',
      'in-use': 'bg-green-100 text-green-800',
      'returned': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  const filteredAvailableEquipment = availableEquipment.filter(equipment =>
    equipment.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipment.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipment.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showLoading || equipmentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading equipment management...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Show not found</div>
          <Button onClick={() => navigate('/show-list')}>
            Back to Show List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/show-list')}
            className="flex items-center space-x-2"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Back to Shows</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manage Equipment</h1>
            <p className="text-slate-600">{show.name} - {new Date(show.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ListViewIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <CardViewIcon className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2"
          >
            <AddIcon className="w-4 h-4" />
            <span>Add Equipment</span>
          </Button>
        </div>
      </div>

      {/* Equipment List */}
      {showEquipment.length === 0 ? (
        <Card className="text-center py-12">
          <Card.Body>
            <div className="text-slate-300 mb-4">📦</div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No equipment allocated</h3>
            <p className="text-slate-600 mb-4">
              Start by adding equipment to this show
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              Add Equipment
            </Button>
          </Card.Body>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card>
          <Card.Body className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Equipment</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Notes</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {showEquipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{item.equipment?.name}</div>
                          <div className="text-sm text-slate-600">
                            {item.equipment?.brand} {item.equipment?.model}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div>Needed: {item.quantity_needed}</div>
                          <div>Allocated: {item.quantity_allocated}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600 max-w-xs truncate">
                          {item.notes || 'No notes'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {item.status === 'requested' && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckout(item.id)}
                              disabled={checkoutMutation.isLoading}
                            >
                              ✓
                            </Button>
                          )}
                          {(item.status === 'checked-out' || item.status === 'in-use') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReturn(item.id)}
                              disabled={returnMutation.isLoading}
                            >
                              Return
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveEquipment(item.id)}
                            disabled={removeEquipmentMutation.isLoading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showEquipment.map((item) => (
            <Card key={item.id}>
              <Card.Body>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-slate-800">{item.equipment?.name}</h3>
                    <p className="text-sm text-slate-600">
                      {item.equipment?.brand} {item.equipment?.model}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Needed:</span>
                    <span className="font-medium">{item.quantity_needed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Allocated:</span>
                    <span className="font-medium">{item.quantity_allocated}</span>
                  </div>
                  {item.notes && (
                    <div className="text-sm">
                      <span className="text-slate-600">Notes:</span>
                      <p className="text-slate-800 mt-1">{item.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {item.status === 'requested' && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckout(item.id)}
                      disabled={checkoutMutation.isLoading}
                      className="flex-1"
                    >
                      Check Out
                    </Button>
                  )}
                  {(item.status === 'checked-out' || item.status === 'in-use') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturn(item.id)}
                      disabled={returnMutation.isLoading}
                      className="flex-1"
                    >
                      Return
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveEquipment(item.id)}
                    disabled={removeEquipmentMutation.isLoading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Add Equipment to Show</h2>
            
            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Equipment Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Equipment
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredAvailableEquipment.map((equipment) => (
                  <div
                    key={equipment.id}
                    onClick={() => setSelectedEquipment(equipment)}
                    className={`p-3 cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                      selectedEquipment?.id === equipment.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-800">{equipment.name}</div>
                    <div className="text-sm text-slate-600">
                      {equipment.brand} {equipment.model} - Qty: {equipment.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedEquipment && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity Needed
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedEquipment.quantity}
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this equipment allocation..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedEquipment(null);
                  setQuantityNeeded(1);
                  setNotes('');
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEquipment}
                disabled={!selectedEquipment || quantityNeeded <= 0 || addEquipmentMutation.isLoading}
              >
                {addEquipmentMutation.isLoading ? 'Adding...' : 'Add Equipment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEquipment;
