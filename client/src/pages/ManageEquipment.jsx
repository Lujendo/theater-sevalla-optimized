import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Card, Button, Input } from '../components/ui';
import { ChevronLeftIcon, AddIcon, TrashIcon, ListViewIcon, CardViewIcon, InfoIcon, EditIcon, ExternalLinkIcon } from '../components/Icons';
import { getShow, getShowEquipment, addEquipmentToShow, updateShowEquipment, removeEquipmentFromShow, checkoutEquipment, returnEquipment } from '../services/showService';
import { getEquipment } from '../services/equipmentService';
import EquipmentAvailability from '../components/EquipmentAvailability';
import ShowEquipmentEditModal from '../components/ShowEquipmentEditModal';
import InlineQuantityEdit from '../components/InlineQuantityEdit';
import InlineStatusEdit from '../components/InlineStatusEdit';
import ShowListExportModal from '../components/ShowListExportModal';

// Utility function to calculate missing quantity
const calculateMissingQuantity = (quantityNeeded, quantityAllocated) => {
  const needed = parseInt(quantityNeeded) || 0;
  const allocated = parseInt(quantityAllocated) || 0;
  return Math.max(0, needed - allocated);
};

const ManageEquipment = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityEquipmentId, setAvailabilityEquipmentId] = useState(null);

  // Independent editing states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineEditingField, setInlineEditingField] = useState(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

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

  // Checkout equipment mutation with validation
  const checkoutMutation = useMutation({
    mutationFn: async (allocationId) => {
      // First validate the status change
      const validation = await axios.post(`/api/show-equipment/allocation/${allocationId}/validate-status`, {
        newStatus: 'checked-out',
        quantity: 1
      });

      if (!validation.data.valid) {
        throw new Error(validation.data.conflicts[0]?.message || 'Status change not allowed');
      }

      // If validation passes, update the status
      const response = await axios.put(`/api/show-equipment/allocation/${allocationId}`, {
        status: 'checked-out'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['equipmentAvailability']);
      toast.success('Equipment checked out');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.conflicts?.[0]?.message || error.message;
      toast.error(`Failed to checkout equipment: ${errorMessage}`);
    }
  });

  // Return equipment mutation with validation
  const returnMutation = useMutation({
    mutationFn: async (allocationId) => {
      // First validate the status change
      const validation = await axios.post(`/api/show-equipment/allocation/${allocationId}/validate-status`, {
        newStatus: 'returned',
        quantity: 1
      });

      if (!validation.data.valid) {
        throw new Error(validation.data.conflicts[0]?.message || 'Status change not allowed');
      }

      // If validation passes, update the status
      const response = await axios.put(`/api/show-equipment/allocation/${allocationId}`, {
        status: 'returned'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showEquipment', showId]);
      queryClient.invalidateQueries(['equipmentAvailability']);
      toast.success('Equipment returned');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.conflicts?.[0]?.message || error.message;
      toast.error(`Failed to return equipment: ${errorMessage}`);
    }
  });

  const handleAddEquipment = () => {
    if (bulkMode && selectedEquipmentList.length > 0) {
      // Add multiple equipment items
      selectedEquipmentList.forEach(equipment => {
        addEquipmentMutation.mutate({
          equipmentId: equipment.id,
          quantityNeeded: equipment.quantity || 1,
          notes: equipment.notes || ''
        });
      });
    } else if (selectedEquipment && quantityNeeded > 0) {
      // Add single equipment item
      addEquipmentMutation.mutate({
        equipmentId: selectedEquipment.id,
        quantityNeeded,
        notes
      });
    }
  };

  const handleBulkEquipmentToggle = (equipment) => {
    setSelectedEquipmentList(prev => {
      const exists = prev.find(item => item.id === equipment.id);
      if (exists) {
        return prev.filter(item => item.id !== equipment.id);
      } else {
        return [...prev, { ...equipment, quantity: 1, notes: '' }];
      }
    });
  };

  const updateBulkEquipmentQuantity = (equipmentId, quantity) => {
    setSelectedEquipmentList(prev =>
      prev.map(item =>
        item.id === equipmentId ? { ...item, quantity: parseInt(quantity) || 1 } : item
      )
    );
  };

  const updateBulkEquipmentNotes = (equipmentId, notes) => {
    setSelectedEquipmentList(prev =>
      prev.map(item =>
        item.id === equipmentId ? { ...item, notes } : item
      )
    );
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

  const handleShowAvailability = (equipmentId) => {
    setAvailabilityEquipmentId(equipmentId);
    setShowAvailabilityModal(true);
  };

  // Navigate to equipment details
  const handleNavigateToEquipment = (equipmentId) => {
    navigate(`/equipment/${equipmentId}`);
  };

  // Independent editing handlers
  const handleEditEquipment = (equipment) => {
    setEditingEquipment(equipment);
    setShowEditModal(true);
  };

  const handleInlineEdit = (equipmentId, field) => {
    setInlineEditingId(equipmentId);
    setInlineEditingField(field);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditingField(null);
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
    equipment.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Equipment Management</h2>
          <p className="text-slate-600">Manage equipment allocation for this show</p>
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

          {/* Export Button */}
          {showEquipment.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export List</span>
            </Button>
          )}

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
              <table className="table-wide">
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
                          <button
                            onClick={() => handleNavigateToEquipment(item.equipment_id)}
                            className="font-medium text-slate-800 hover:text-primary-600 hover:underline transition-colors text-left flex items-center space-x-1 group"
                            title="Click to view equipment details"
                          >
                            <span>{item.equipment?.name || item.equipment?.type}</span>
                            <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="text-sm text-slate-600">
                            {item.equipment?.brand} {item.equipment?.model}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-600">Needed:</span>
                            {inlineEditingId === item.id && inlineEditingField === 'quantityNeeded' ? (
                              <InlineQuantityEdit
                                showEquipment={item}
                                field="quantityNeeded"
                                showId={showId}
                                onCancel={handleCancelInlineEdit}
                              />
                            ) : (
                              <button
                                onClick={() => handleInlineEdit(item.id, 'quantityNeeded')}
                                className="font-medium text-slate-800 hover:text-primary-600 hover:bg-primary-50 px-1 py-0.5 rounded transition-colors"
                                title="Click to edit"
                              >
                                {item.quantity_needed}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-600">Allocated:</span>
                            {inlineEditingId === item.id && inlineEditingField === 'quantityAllocated' ? (
                              <InlineQuantityEdit
                                showEquipment={item}
                                field="quantityAllocated"
                                showId={showId}
                                onCancel={handleCancelInlineEdit}
                              />
                            ) : (
                              <button
                                onClick={() => handleInlineEdit(item.id, 'quantityAllocated')}
                                className="font-medium text-slate-800 hover:text-primary-600 hover:bg-primary-50 px-1 py-0.5 rounded transition-colors"
                                title="Click to edit"
                              >
                                {item.quantity_allocated}
                              </button>
                            )}
                          </div>
                          {/* Missing Quantity Display */}
                          {(() => {
                            const missing = calculateMissingQuantity(item.quantity_needed, item.quantity_allocated);
                            return missing > 0 ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-red-600 font-medium">Missing:</span>
                                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
                                  {missing}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {inlineEditingId === item.id && inlineEditingField === 'status' ? (
                          <InlineStatusEdit
                            showEquipment={item}
                            showId={showId}
                            onCancel={handleCancelInlineEdit}
                          />
                        ) : (
                          <button
                            onClick={() => handleInlineEdit(item.id, 'status')}
                            className="hover:bg-slate-50 p-1 rounded transition-colors"
                            title="Click to edit status"
                          >
                            {getStatusBadge(item.status)}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600 max-w-xs truncate">
                          {item.notes || 'No notes'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEquipment(item)}
                            className="text-slate-600 hover:text-slate-700"
                            title="Edit allocation"
                          >
                            <EditIcon className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowAvailability(item.equipment_id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="View availability"
                          >
                            <InfoIcon className="w-3 h-3" />
                          </Button>
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
                    <button
                      onClick={() => handleNavigateToEquipment(item.equipment_id)}
                      className="font-medium text-slate-800 hover:text-primary-600 hover:underline transition-colors text-left flex items-center space-x-1 group"
                      title="Click to view equipment details"
                    >
                      <span>{item.equipment?.name || item.equipment?.type}</span>
                      <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <p className="text-sm text-slate-600">
                      {item.equipment?.brand} {item.equipment?.model}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Needed:</span>
                    {inlineEditingId === item.id && inlineEditingField === 'quantityNeeded' ? (
                      <InlineQuantityEdit
                        showEquipment={item}
                        field="quantityNeeded"
                        showId={showId}
                        onCancel={handleCancelInlineEdit}
                      />
                    ) : (
                      <button
                        onClick={() => handleInlineEdit(item.id, 'quantityNeeded')}
                        className="font-medium text-slate-800 hover:text-primary-600 hover:bg-primary-50 px-1 py-0.5 rounded transition-colors"
                        title="Click to edit"
                      >
                        {item.quantity_needed}
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Allocated:</span>
                    {inlineEditingId === item.id && inlineEditingField === 'quantityAllocated' ? (
                      <InlineQuantityEdit
                        showEquipment={item}
                        field="quantityAllocated"
                        showId={showId}
                        onCancel={handleCancelInlineEdit}
                      />
                    ) : (
                      <button
                        onClick={() => handleInlineEdit(item.id, 'quantityAllocated')}
                        className="font-medium text-slate-800 hover:text-primary-600 hover:bg-primary-50 px-1 py-0.5 rounded transition-colors"
                        title="Click to edit"
                      >
                        {item.quantity_allocated}
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Status:</span>
                    {inlineEditingId === item.id && inlineEditingField === 'status' ? (
                      <InlineStatusEdit
                        showEquipment={item}
                        showId={showId}
                        onCancel={handleCancelInlineEdit}
                      />
                    ) : (
                      <button
                        onClick={() => handleInlineEdit(item.id, 'status')}
                        className="hover:bg-slate-50 p-1 rounded transition-colors"
                        title="Click to edit status"
                      >
                        {getStatusBadge(item.status)}
                      </button>
                    )}
                  </div>
                  {/* Missing Quantity Display */}
                  {(() => {
                    const missing = calculateMissingQuantity(item.quantity_needed, item.quantity_allocated);
                    return missing > 0 ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600 font-medium">Missing:</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                          {missing} item{missing !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {item.notes && (
                    <div className="text-sm">
                      <span className="text-slate-600">Notes:</span>
                      <p className="text-slate-800 mt-1">{item.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditEquipment(item)}
                    className="text-slate-600 hover:text-slate-700"
                    title="Edit allocation"
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShowAvailability(item.equipment_id)}
                    className="text-blue-600 hover:text-blue-700"
                    title="View availability"
                  >
                    <InfoIcon className="w-4 h-4" />
                  </Button>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Add Equipment to Show</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Bulk Mode</span>
                <button
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedEquipment(null);
                    setSelectedEquipmentList([]);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    bulkMode ? 'bg-primary-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      bulkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

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
                {bulkMode ? 'Select Multiple Equipment' : 'Select Equipment'}
                {bulkMode && selectedEquipmentList.length > 0 && (
                  <span className="ml-2 text-primary-600">({selectedEquipmentList.length} selected)</span>
                )}
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredAvailableEquipment.map((equipment) => {
                  const isSelected = bulkMode
                    ? selectedEquipmentList.some(item => item.id === equipment.id)
                    : selectedEquipment?.id === equipment.id;

                  return (
                    <div
                      key={equipment.id}
                      onClick={() => bulkMode ? handleBulkEquipmentToggle(equipment) : setSelectedEquipment(equipment)}
                      className={`p-3 cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                        isSelected ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{equipment.type}</div>
                          <div className="text-sm text-slate-600">
                            {equipment.brand} {equipment.model} - Qty: {equipment.quantity}
                          </div>
                        </div>
                        {bulkMode && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Single Equipment Mode */}
            {!bulkMode && selectedEquipment && (
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

            {/* Bulk Equipment Mode */}
            {bulkMode && selectedEquipmentList.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Selected Equipment Details
                </label>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {selectedEquipmentList.map((equipment) => (
                    <div key={equipment.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="font-medium text-slate-800 mb-2">
                        {equipment.type} - {equipment.brand} {equipment.model}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max={equipment.quantity}
                            value={equipment.quantity || 1}
                            onChange={(e) => updateBulkEquipmentQuantity(equipment.id, e.target.value)}
                            size="sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Notes
                          </label>
                          <Input
                            value={equipment.notes || ''}
                            onChange={(e) => updateBulkEquipmentNotes(equipment.id, e.target.value)}
                            placeholder="Notes..."
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedEquipment(null);
                  setSelectedEquipmentList([]);
                  setBulkMode(false);
                  setQuantityNeeded(1);
                  setNotes('');
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEquipment}
                disabled={
                  bulkMode
                    ? selectedEquipmentList.length === 0 || addEquipmentMutation.isLoading
                    : !selectedEquipment || quantityNeeded <= 0 || addEquipmentMutation.isLoading
                }
              >
                {addEquipmentMutation.isLoading
                  ? 'Adding...'
                  : bulkMode
                    ? `Add ${selectedEquipmentList.length} Equipment${selectedEquipmentList.length !== 1 ? 's' : ''}`
                    : 'Add Equipment'
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Availability Modal */}
      {showAvailabilityModal && availabilityEquipmentId && (
        <EquipmentAvailability
          equipmentId={availabilityEquipmentId}
          onClose={() => {
            setShowAvailabilityModal(false);
            setAvailabilityEquipmentId(null);
          }}
        />
      )}

      {/* Show Equipment Edit Modal */}
      {showEditModal && editingEquipment && (
        <ShowEquipmentEditModal
          showEquipment={editingEquipment}
          showId={showId}
          onClose={() => {
            setShowEditModal(false);
            setEditingEquipment(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ShowListExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          show={show}
          equipmentList={showEquipment}
        />
      )}
    </div>
  );
};

export default ManageEquipment;
