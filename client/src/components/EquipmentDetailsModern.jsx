import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, deleteEquipment } from '../services/equipmentService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from './ui';
import ConfirmationDialogModern from './ConfirmationDialogModern';
import ReferenceImageModal from './ReferenceImageModal';
import EquipmentLogList from './EquipmentLogList';
import FileGallery from './FileGallery';
import FileUploadModal from './FileUploadModal';
import AllocateToShowModal from './AllocateToShowModal';
import ShowEquipmentEditModal from './ShowEquipmentEditModal';
import LocationAllocationManager from './LocationAllocationManager';

import { CardViewIcon, ListViewIcon, EditIcon, TrashIcon } from './Icons';
import { toast } from 'react-toastify';
import axios from 'axios';

// Helper function to get file URL
const getFileUrl = (fileId, thumbnail = false) => {
  return `/api/files/${fileId}${thumbnail ? '?thumbnail=true' : ''}`;
};

// Storage Availability Component
const StorageAvailabilitySection = ({ equipmentId }) => {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorageAvailability();
  }, [equipmentId]);

  const fetchStorageAvailability = async () => {
    try {
      const response = await axios.get(`/api/inventory/equipment/${equipmentId}/storage-availability`);
      setStorageData(response.data);
    } catch (error) {
      console.error('Error fetching storage availability:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
        <div className="flex items-center">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <div className="h-5 w-5 bg-green-200 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 w-32 bg-green-200 rounded animate-pulse mb-1"></div>
            <div className="h-3 w-24 bg-green-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="text-right">
          <div className="h-8 w-12 bg-green-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 w-16 bg-green-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!storageData) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="bg-gray-100 p-2 rounded-lg mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-slate-800">Storage Configuration</div>
            <div className="text-sm text-slate-600">No default storage locations configured</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">-</div>
          <div className="text-xs text-slate-600">Available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Installation Information (if applicable) */}
      {storageData.installation_type && storageData.installation_type !== 'portable' && storageData.installation_quantity > 0 && (
        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-slate-800">Installed Equipment</div>
              <div className="text-sm text-slate-600">
                {storageData.installation_location || 'Installation location'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-700">
              {storageData.installation_quantity}
            </div>
            <div className="text-xs text-slate-600">Installed Items</div>
          </div>
        </div>
      )}

      {/* Available in Storage */}
      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
        <div className="flex items-center">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-slate-800">Available in Storage</div>
            <div className="text-sm text-slate-600">
              {storageData.storage_locations?.length > 0
                ? storageData.storage_locations.map(loc => loc.storage_name).join(', ')
                : 'Portable units available for allocation'
              }
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-700">
            {storageData.available_in_storage}
          </div>
          <div className="text-xs text-slate-600">Available Items</div>
        </div>
      </div>

      {/* Storage Status Indicator */}
      {storageData.is_in_storage !== undefined && (
        <div className={`p-3 rounded-lg border ${
          storageData.is_in_storage
            ? 'bg-blue-50 border-blue-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${
              storageData.is_in_storage ? 'text-blue-600' : 'text-yellow-600'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={storageData.is_in_storage ? 'text-blue-800' : 'text-yellow-800'}>
              {storageData.is_in_storage
                ? 'This equipment is currently in a default storage location'
                : 'This equipment is currently deployed outside of main storage'
              }
            </span>
          </div>
        </div>
      )}

      {/* Quantity Breakdown Summary */}
      {storageData.total_quantity && (storageData.installation_quantity > 0 || storageData.allocated_from_storage > 0 || storageData.reserved_from_storage > 0) && (
        <div className="p-3 bg-slate-50 rounded-lg border">
          <div className="text-sm font-medium text-slate-800 mb-2">Quantity Breakdown</div>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Total Equipment:</span>
              <span className="font-medium">{storageData.total_quantity}</span>
            </div>
            {storageData.installation_quantity > 0 && (
              <div className="flex justify-between">
                <span>• Permanently Installed:</span>
                <span className="font-medium text-orange-600">{storageData.installation_quantity}</span>
              </div>
            )}
            {storageData.allocated_from_storage > 0 && (
              <div className="flex justify-between">
                <span>• Allocated to Shows:</span>
                <span className="font-medium text-blue-600">{storageData.allocated_from_storage}</span>
              </div>
            )}
            {storageData.reserved_from_storage > 0 && (
              <div className="flex justify-between">
                <span>• Reserved for Shows:</span>
                <span className="font-medium text-yellow-600">{storageData.reserved_from_storage}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span className="font-medium">Available for Allocation:</span>
              <span className="font-bold text-green-600">{storageData.available_in_storage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to calculate missing quantity
const calculateMissingQuantity = (quantityNeeded, quantityAllocated) => {
  const needed = parseInt(quantityNeeded) || 0;
  const allocated = parseInt(quantityAllocated) || 0;
  return Math.max(0, needed - allocated);
};

const EquipmentDetailsModern = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAllocationEditModal, setShowAllocationEditModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [showLocationAllocationModal, setShowLocationAllocationModal] = useState(false);

  // Allocation detail popup states
  const [showAllocationDetailModal, setShowAllocationDetailModal] = useState(false);
  const [allocationDetailType, setAllocationDetailType] = useState(null); // 'locations', 'shows', 'installed'
  const [allocationDetailData, setAllocationDetailData] = useState(null);

  // Status update modal states
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);

  const [activeTab, setActiveTab] = useState('details');
  const [layout, setLayout] = useState('grid');



  // Fetch equipment details
  const { data: equipment, isLoading, isError, error } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
    staleTime: 0, // Always refetch when navigating
    cacheTime: 0, // Don't cache to ensure fresh data
  });

  // Force refresh all queries when equipment ID changes (for direct URL navigation)
  useEffect(() => {
    console.log('🔄 Equipment ID changed, invalidating all queries for:', id);
    queryClient.invalidateQueries(['equipment', id]);
    queryClient.invalidateQueries(['equipmentAvailability', id]);
    queryClient.invalidateQueries(['equipmentShowAllocations', id]);
    queryClient.invalidateQueries(['inventoryAllocations', id]);
  }, [id, queryClient]);

  // Fetch equipment availability data using UNIFIED calculation method
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['equipmentAvailability', id],
    queryFn: async () => {
      const response = await axios.get(`/api/equipment/${id}/availability`);
      console.log('📊 Availability data response:', response.data);
      console.log('📊 Show allocated count:', response.data?.show_allocated);
      console.log('📊 Show status breakdown:', response.data?.show_status_breakdown);
      console.log('📊 Installation allocated count:', response.data?.installation_allocated);
      console.log('📊 Total allocated count:', response.data?.total_allocated);
      console.log('📊 Available quantity:', response.data?.available_quantity);
      return response.data;
    },
    enabled: !!id,
    staleTime: 0, // Always refetch when navigating
    cacheTime: 0 // Don't cache to ensure fresh data
  });

  // Fetch show allocations for this equipment
  const { data: showAllocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ['equipmentShowAllocations', id],
    queryFn: async () => {
      console.log('🎭 Fetching show allocations for equipment ID:', id);
      const response = await axios.get(`/api/show-equipment/equipment/${id}/shows`);
      console.log('🎭 Show allocations response:', response.data);
      console.log('🎭 Show allocations count:', response.data.length);
      console.log('🎭 Show allocations details:', response.data.map(a => ({
        id: a.id,
        status: a.status,
        quantity_needed: a.quantity_needed,
        quantity_allocated: a.quantity_allocated,
        show_name: a.show_name
      })));
      return response.data;
    },
    enabled: !!id,
    staleTime: 0, // Always refetch when navigating
    cacheTime: 0 // Don't cache to ensure fresh data
  });

  // Fetch locations for inventory management
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/locations');
        return response.data.locations || response.data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        return []; // Return empty array on error
      }
    }
  });

  // Fetch inventory allocations for this equipment
  const { data: inventoryAllocations } = useQuery({
    queryKey: ['inventoryAllocations', id],
    queryFn: async () => {
      try {
        console.log(`🔍 Fetching inventory allocations for equipment ${id}`);
        const response = await axios.get(`/api/equipment/${id}/allocations`);
        console.log(`📦 Inventory allocations response:`, response.data);
        const allocations = response.data.allocations || [];
        console.log(`📋 Processed allocations:`, allocations);
        return allocations;
      } catch (error) {
        console.error('❌ Error fetching inventory allocations:', error);
        return [];
      }
    },
    enabled: !!id,
    staleTime: 0, // Always refetch when navigating
    cacheTime: 0 // Don't cache to ensure fresh data
  });

  // Get current location details for this equipment
  const locationsArray = Array.isArray(locations) ? locations : [];

  // Helper function to determine the actual current location with proper hierarchy
  const getCurrentLocationInfo = () => {
    // Priority 1: Installation location (for fixed/semi-permanent equipment)
    if ((equipment?.installation_type === 'fixed' || equipment?.installation_type === 'semi-permanent') &&
        (equipment?.installation_location || equipment?.installation_location_id)) {

      // If we have installation_location_id, try to find the location record
      if (equipment.installation_location_id) {
        const installationLocationRecord = locationsArray.find(loc => loc.id === equipment.installation_location_id);
        if (installationLocationRecord) {
          return {
            location: installationLocationRecord,
            displayName: installationLocationRecord.name,
            source: 'installation_location_id',
            isInstallation: true
          };
        }
      }

      // Fallback to installation_location text field
      if (equipment.installation_location) {
        return {
          location: null,
          displayName: equipment.installation_location,
          source: 'installation_location',
          isInstallation: true
        };
      }
    }

    // Priority 2: Regular location_id
    if (equipment?.location_id) {
      const locationRecord = locationsArray.find(loc => loc.id === equipment.location_id);
      if (locationRecord) {
        return {
          location: locationRecord,
          displayName: locationRecord.name,
          source: 'location_id',
          isInstallation: false
        };
      }
    }

    // Priority 3: Regular location text field
    if (equipment?.location) {
      return {
        location: null,
        displayName: equipment.location,
        source: 'location',
        isInstallation: false
      };
    }

    // Fallback: Unknown location
    return {
      location: null,
      displayName: 'Unknown Location',
      source: 'fallback',
      isInstallation: false
    };
  };

  const currentLocationInfo = getCurrentLocationInfo();
  const currentLocation = currentLocationInfo.location; // For backward compatibility

  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate('/equipment');
    },
  });

  // Remove allocation mutation
  const removeAllocationMutation = useMutation({
    mutationFn: async (allocationId) => {
      const response = await axios.delete(`/api/show-equipment/${allocationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipmentShowAllocations', id]);
      queryClient.invalidateQueries(['equipmentAvailability', id]);
      queryClient.invalidateQueries(['equipment', id]);
      queryClient.invalidateQueries(['inventoryAllocations', id]);
      toast.success('Allocation removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove allocation: ${error.response?.data?.message || error.message}`);
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ allocationId, status }) => {
      const response = await axios.put(`/api/show-equipment/allocation/${allocationId}`, {
        status: status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipmentShowAllocations', id]);
      queryClient.invalidateQueries(['equipmentAvailability', id]);
      queryClient.invalidateQueries(['equipment', id]);
      queryClient.invalidateQueries(['inventoryAllocations', id]);
      toast.success('Status updated successfully');
      setShowStatusUpdateModal(false);

      // Refresh allocation detail data if the popup is open
      if (showAllocationDetailModal && allocationDetailType) {
        // Trigger a refresh of the allocation detail popup data
        setTimeout(() => {
          handleShowAllocationDetail(allocationDetailType);
        }, 100); // Small delay to ensure queries have been invalidated
      }
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  });



  // Handle edit button click
  const handleEdit = () => {
    navigate(`/equipment/${id}/edit`);
  };

  // Handle file upload success
  const handleFileUploadSuccess = (files) => {
    // Invalidate the equipment query to refetch with the new files
    queryClient.invalidateQueries(['equipment', id]);
    toast.success(`Successfully uploaded ${files.length} file(s)`);
  };

  // Handle delete button click
  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirmation(false);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  // Handle back button click
  const handleBack = () => {
    navigate('/equipment');
  };



  // Handle edit allocation
  const handleEditAllocation = (allocation) => {
    setEditingAllocation(allocation);
    setShowAllocationEditModal(true);
  };

  // Handle allocation edit modal close with data refresh
  const handleAllocationEditClose = () => {
    setShowAllocationEditModal(false);
    setEditingAllocation(null);
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries(['equipmentShowAllocations', id]);
    queryClient.invalidateQueries(['equipmentAvailability', id]);
    queryClient.invalidateQueries(['equipment', id]);
    queryClient.invalidateQueries(['inventoryAllocations', id]);
  };

  // Handle remove allocation
  const handleRemoveAllocation = (allocation) => {
    if (window.confirm(`Are you sure you want to remove this allocation from "${allocation.show_name}"? This action cannot be undone.`)) {
      removeAllocationMutation.mutate(allocation.id);
    }
  };



  // Handle allocate to show button click (from inventory tab)
  const handleAllocateToShow = () => {
    setShowAllocateModal(true);
  };

  // Handle return from show
  const handleReturnFromShow = (allocation) => {
    if (window.confirm(`Return ${allocation.quantity_allocated} items from "${allocation.show_name}" back to storage?`)) {
      removeAllocationMutation.mutate(allocation.id);
    }
  };

  // Handle status update
  const handleStatusUpdate = (allocation) => {
    setSelectedAllocation(allocation);
    setShowStatusUpdateModal(true);
  };

  // Handle allocation detail popup
  const handleShowAllocationDetail = (type) => {
    console.log('🔍 handleShowAllocationDetail called with type:', type);

    // Get installation location name for display - MOVED TO TOP
    const installationLocationName = (() => {
      // Priority 1: installation_location_id (find location record)
      if (equipment?.installation_location_id) {
        const installationLocationRecord = locationsArray.find(loc => loc.id === equipment.installation_location_id);
        if (installationLocationRecord) {
          return installationLocationRecord.name;
        }
      }
      // Priority 2: installation_location (text field)
      if (equipment?.installation_location) {
        return equipment.installation_location;
      }
      // Fallback
      return 'Installation Location';
    })();

    console.log('🔍 installationLocationName:', installationLocationName);

    let data = null;

    switch (type) {
      case 'inventory':
        // Show only location allocations (from inventory_allocation table)
        data = {
          title: 'Location Allocations',
          items: inventoryAllocations ? inventoryAllocations.map(allocation => ({
            ...allocation,
            allocation_type: 'location',
            display_type: 'Location Allocation'
          })) : [],
          totalCount: inventoryAllocations ? inventoryAllocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity_allocated) || 0), 0) : 0,
          icon: 'location',
          color: 'blue'
        };
        break;
      case 'locations':
        // Combine both inventory allocations and show allocations for "ALL LOCATIONS" popup
        const combinedItems = [];

        // Add inventory allocations (physical location allocations)
        if (inventoryAllocations && inventoryAllocations.length > 0) {
          inventoryAllocations.forEach(allocation => {
            combinedItems.push({
              ...allocation,
              allocation_type: 'location',
              display_type: 'Location Allocation'
            });
          });
        }

        // Add show allocations (shows count as "locations" too)
        if (showAllocations && showAllocations.length > 0) {
          showAllocations.forEach(allocation => {
            combinedItems.push({
              location_name: allocation.show_name,
              venue: allocation.venue,
              show_date: allocation.show_date,
              quantity_allocated: allocation.quantity_allocated || allocation.quantity_needed || 0,
              status: allocation.status,
              allocation_type: 'show',
              display_type: 'Show Allocation'
            });
          });
        }

        data = {
          title: 'All Location Allocations',
          items: combinedItems,
          totalCount: (availabilityData?.total_allocated || 0) + (availabilityData?.show_allocated || 0),
          icon: 'location',
          color: 'blue'
        };
        break;
      case 'shows':
        data = {
          title: 'Show Allocations',
          items: showAllocations || [],
          totalCount: availabilityData?.show_allocated || 0,
          icon: 'show',
          color: 'orange'
        };
        break;
      case 'installed':
        // Get installation location with proper hierarchy
        let installationLocationName = 'Installation Location';

        // Priority 1: installation_location_id (find location record)
        if (equipment?.installation_location_id) {
          const installationLocationRecord = locationsArray.find(loc => loc.id === equipment.installation_location_id);
          if (installationLocationRecord) {
            installationLocationName = installationLocationRecord.name;
          }
        }
        // Priority 2: installation_location (text field)
        else if (equipment?.installation_location) {
          installationLocationName = equipment.installation_location;
        }

        data = {
          title: 'Installation Allocations',
          items: (equipment?.installation_type && equipment?.installation_type !== 'portable') ? [{
            location_name: installationLocationName,
            quantity_allocated: availabilityData?.installation_allocated || 0,
            status: 'installed',
            type: equipment.installation_type || 'Fixed Installation',
            installation_notes: equipment.installation_notes,
            installation_date: equipment.installation_date
          }] : [],
          totalCount: availabilityData?.installation_allocated || 0,
          icon: 'installation',
          color: 'purple'
        };
        break;
      case 'all':
        // Show ALL allocations - Location Allocations + Shows + Installations
        const allItems = [];

        // Add location allocations
        if (inventoryAllocations && inventoryAllocations.length > 0) {
          inventoryAllocations.forEach(allocation => {
            allItems.push({
              ...allocation,
              allocation_type: 'location',
              display_type: 'Location Allocation',
              icon_color: 'blue'
            });
          });
        }

        // Add show allocations
        if (showAllocations && showAllocations.length > 0) {
          showAllocations.forEach(allocation => {
            allItems.push({
              location_name: allocation.show_name,
              venue: allocation.venue,
              show_date: allocation.show_date,
              quantity_allocated: allocation.quantity_allocated || allocation.quantity_needed || 0,
              status: allocation.status,
              allocation_type: 'show',
              display_type: 'Show Allocation',
              icon_color: 'orange'
            });
          });
        }

        // Add installation allocations
        if (equipment?.installation_type && equipment?.installation_type !== 'portable' && availabilityData?.installation_allocated > 0) {
          allItems.push({
            location_name: installationLocationName,
            quantity_allocated: availabilityData.installation_allocated,
            status: 'installed',
            allocation_type: 'installation',
            display_type: equipment.installation_type === 'fixed' ? 'Fixed Installation' : 'Semi-Permanent Installation',
            installation_notes: equipment.installation_notes,
            installation_date: equipment.installation_date,
            icon_color: 'purple'
          });
        }

        data = {
          title: 'All Equipment Locations',
          items: allItems,
          totalCount: (availabilityData?.total_allocated || 0) + (availabilityData?.show_allocated || 0),
          icon: 'all',
          color: 'gray'
        };
        break;
      case 'total':
        // Show complete equipment overview - all items and their status
        const totalItems = [];

        // Add all allocated items (same as 'all' case)
        if (inventoryAllocations && inventoryAllocations.length > 0) {
          inventoryAllocations.forEach(allocation => {
            totalItems.push({
              ...allocation,
              allocation_type: 'location',
              display_type: 'Location Allocation',
              icon_color: 'blue'
            });
          });
        }

        if (showAllocations && showAllocations.length > 0) {
          showAllocations.forEach(allocation => {
            totalItems.push({
              location_name: allocation.show_name,
              venue: allocation.venue,
              show_date: allocation.show_date,
              quantity_allocated: allocation.quantity_allocated || allocation.quantity_needed || 0,
              status: allocation.status,
              allocation_type: 'show',
              display_type: 'Show Allocation',
              icon_color: 'orange'
            });
          });
        }

        if (equipment?.installation_type && equipment?.installation_type !== 'portable' && availabilityData?.installation_allocated > 0) {
          totalItems.push({
            location_name: installationLocationName,
            quantity_allocated: availabilityData.installation_allocated,
            status: 'installed',
            allocation_type: 'installation',
            display_type: equipment.installation_type === 'fixed' ? 'Fixed Installation' : 'Semi-Permanent Installation',
            installation_notes: equipment.installation_notes,
            installation_date: equipment.installation_date,
            icon_color: 'purple'
          });
        }

        // Add available items in default storage
        if (availabilityData?.available_quantity > 0) {
          totalItems.push({
            location_name: 'Default Storage',
            quantity_allocated: availabilityData.available_quantity,
            status: 'available',
            allocation_type: 'storage',
            display_type: 'Available in Storage',
            icon_color: 'green'
          });
        }

        data = {
          title: 'Total Equipment Overview',
          items: totalItems,
          totalCount: availabilityData?.total_quantity || 0,
          icon: 'total',
          color: 'slate'
        };
        break;
      case 'available':
        // Show available items in default storage
        data = {
          title: 'Available Equipment',
          items: availabilityData?.available_quantity > 0 ? [{
            location_name: 'Default Storage',
            quantity_allocated: availabilityData.available_quantity,
            status: 'available',
            allocation_type: 'storage',
            display_type: 'Available in Storage',
            notes: 'Items available for allocation to locations, shows, or installations'
          }] : [],
          totalCount: availabilityData?.available_quantity || 0,
          icon: 'available',
          color: 'green'
        };
        break;
      default:
        return;
    }

    setAllocationDetailType(type);
    setAllocationDetailData(data);
    setShowAllocationDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Equipment Details</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Equipment Details</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading equipment</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error?.message || 'Failed to load equipment details'}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                >
                  Back to Equipment List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'in-use':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'unavailable':
        return 'secondary';
      case 'broken':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Convert reference_image_id to number for proper comparison
  const refImageId = equipment.reference_image_id ? parseInt(equipment.reference_image_id) : null;

  // Check if reference image exists in files
  const referenceImage = equipment.files?.find(file => file.id === refImageId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Equipment #{equipment.id} - {equipment.brand} {equipment.model}</h1>
                <p className="text-slate-500 text-sm">
                  {equipment.type} {equipment.category && `• ${equipment.category}`} • {equipment.serial_number}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-6">
                {/* Back to List Button */}
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to List
                </Button>


              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {(user?.role === 'admin' || user?.role === 'advanced') && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAllocateModal(true)}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Allocate to Show
              </Button>
              <Button
                variant="primary"
                onClick={handleEdit}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            </>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Grid layout for top section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left column - Equipment Information Tabs */}
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'details'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'details' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'inventory'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'inventory' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Location & Storage
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('allocations')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'allocations'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'allocations' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Show Allocations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'history' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Movement History
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'documents' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Documents & Attachments
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  <div className="grid grid-cols-1 gap-6">
                    {/* Equipment Information Card */}
                    <div>
                      <Card className="h-full">
                        <Card.Header className="bg-slate-50">
                          <Card.Title className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Equipment Information
                          </Card.Title>
                        </Card.Header>
                        <Card.Body>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Category</h3>
                              <p className="mt-1 text-sm font-medium text-slate-900">{equipment.category || 'Not specified'}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Type</h3>
                              <p className="mt-1 text-sm font-medium text-slate-900">{equipment.type}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Brand</h3>
                              <p className="mt-1 text-sm font-medium text-slate-900">{equipment.brand}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Model</h3>
                              <p className="mt-1 text-sm font-medium text-slate-900">{equipment.model}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Serial Number</h3>
                              <p className="mt-1 text-sm font-medium text-slate-900">{equipment.serial_number}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-medium text-slate-500">Status</h3>
                              <div className="mt-1">
                                {equipment.status && (
                                  <Badge variant={getStatusVariant(equipment.status)} size="sm">
                                    {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>


                          </div>

                          {equipment.description && (
                            <div className="mt-6 border-t border-slate-200 pt-4">
                              <div className="flex items-center mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                <h3 className="text-xs font-medium text-slate-700">Description</h3>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-sm text-slate-800 whitespace-pre-line">{equipment.description}</p>
                              </div>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </div>

                    {/* Location Allocation Breakdown - Same as Location & Storage Tab */}
                    {availabilityData && (
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="p-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                              </svg>
                              <span className="text-lg font-medium text-slate-700">Current Distribution</span>
                            </div>
                            <div className="text-sm text-slate-600">
                              {availabilityData.total_quantity} total items
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">Where your equipment is currently located</p>
                        </div>
                        <div className="p-4">
                          <div className="space-y-3">
                            {/* Summary Stats - Clickable */}
                            <div className="grid grid-cols-5 gap-3 text-center bg-slate-50 p-4 rounded-lg">
                              <div>
                                <div className="text-xl font-bold text-slate-800">{availabilityData.total_quantity}</div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">Total</div>
                              </div>
                              <button
                                onClick={() => handleShowAllocationDetail('locations')}
                                className="group hover:bg-blue-50 rounded-lg p-2 transition-colors cursor-pointer"
                                disabled={(availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0) === 0}
                              >
                                <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700">
                                  {(availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0)}
                                </div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-blue-600">
                                  Locations
                                </div>
                              </button>
                              <button
                                onClick={() => handleShowAllocationDetail('shows')}
                                className="group hover:bg-orange-50 rounded-lg p-2 transition-colors cursor-pointer"
                                disabled={(availabilityData.show_allocated || 0) === 0}
                              >
                                <div className="text-xl font-bold text-orange-600 group-hover:text-orange-700">
                                  {availabilityData.show_allocated || 0}
                                </div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-orange-600">
                                  In Shows
                                </div>
                              </button>
                              <button
                                onClick={() => handleShowAllocationDetail('installed')}
                                className="group hover:bg-purple-50 rounded-lg p-2 transition-colors cursor-pointer"
                                disabled={(availabilityData.installation_allocated || 0) === 0}
                              >
                                <div className="text-xl font-bold text-purple-600 group-hover:text-purple-700">
                                  {availabilityData.installation_allocated || 0}
                                </div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-purple-600">
                                  Installed
                                </div>
                              </button>
                              <div>
                                <div className={`text-xl font-bold ${availabilityData.available_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {availabilityData.available_quantity}
                                </div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">Available</div>
                              </div>
                            </div>

                            {/* Detailed Allocation Breakdown */}
                            {(availabilityData.total_allocated > 0 || availabilityData.show_allocated > 0 || availabilityData.installation_allocated > 0) ? (
                              <div className="space-y-3">
                                {/* Complete allocation breakdown including shows and locations */}
                                {(inventoryAllocations && inventoryAllocations.length > 0) || (availabilityData && (availabilityData.show_allocated > 0 || availabilityData.installation_allocated > 0)) ? (
                                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                                    <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Detailed Breakdown</h4>
                                    <div className="space-y-2">
                                      {/* Show allocations with specific show names */}
                                      {showAllocations && showAllocations.length > 0 && showAllocations.map((allocation, index) => (
                                        <div key={`show-${index}`} className="flex items-center justify-between text-sm">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                            <span className="text-slate-700">
                                              {allocation.show_name}
                                              {allocation.venue && (
                                                <span className="text-xs text-slate-500 ml-1">@ {allocation.venue}</span>
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-800">{allocation.quantity_allocated || allocation.quantity_needed || 0}</span>
                                            <span className="text-xs text-orange-600">
                                              ({allocation.status || 'allocated'})
                                            </span>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Fallback for show allocations without details */}
                                      {availabilityData && availabilityData.show_allocated > 0 && (!showAllocations || showAllocations.length === 0) && (
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                            <span className="text-slate-700">In Shows</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-800">{availabilityData.show_allocated}</span>
                                            <span className="text-xs text-orange-600">(shows)</span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Installation allocations with specific location */}
                                      {availabilityData && availabilityData.installation_allocated > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                            <span className="text-slate-700">
                                              Installed
                                              {equipment?.installation_location && (
                                                <span className="text-xs text-slate-500 ml-1">@ {equipment.installation_location}</span>
                                              )}
                                              {!equipment?.installation_location && equipment?.installation_location_id && currentLocationInfo?.isInstallation && (
                                                <span className="text-xs text-slate-500 ml-1">@ {currentLocationInfo.displayName}</span>
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-800">{availabilityData.installation_allocated}</span>
                                            <span className="text-xs text-purple-600">
                                              ({equipment?.installation_type || 'fixed'})
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Location allocations */}
                                      {inventoryAllocations && inventoryAllocations.map((allocation, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                            <span className="text-slate-700">{allocation.location_name}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-800">{allocation.quantity_allocated}</span>
                                            <span className="text-xs text-slate-500">
                                              {allocation.status && allocation.status !== 'allocated' && `(${allocation.status})`}
                                            </span>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Available in default storage */}
                                      {availabilityData && availabilityData.available_quantity > 0 && (
                                        <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-2">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                            <span className="text-slate-700">Default Storage</span>
                                          </div>
                                          <span className="font-medium text-slate-800">{availabilityData.available_quantity}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-800">All Items in Default Storage</span>
                                  </div>
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                    {availabilityData.total_quantity} items
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  All {availabilityData.total_quantity} items are currently in the default storage location.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Inventory & Location Tab */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Location & Storage Management</h2>
                  </div>

                  {/* Location Management Section - MOVED TO TOP */}
                  {(user?.role === 'admin' || user?.role === 'advanced') && (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
                      <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-lg font-medium text-slate-700">Location Management</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Manage equipment location and allocations</p>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Button
                            variant="primary"
                            className="flex items-center justify-center py-3"
                            onClick={() => setShowLocationAllocationModal(true)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <div className="text-left">
                              <div className="font-medium">Manage Locations & Installation</div>
                              <div className="text-xs opacity-90">Allocate items to locations & manage installations</div>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="flex items-center justify-center py-3"
                            onClick={handleAllocateToShow}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                            </svg>
                            <div className="text-left">
                              <div className="font-medium">Allocate to Show</div>
                              <div className="text-xs opacity-75">Reserve items for shows</div>
                            </div>
                          </Button>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-800">
                              <div className="font-medium mb-1">Complete Allocation & Return System</div>
                              <div className="text-blue-700">
                                • <strong>Location Allocation:</strong> Distribute quantities across locations + return to storage<br/>
                                • <strong>Installation Management:</strong> Set installations + return from installation<br/>
                                • <strong>Show Allocation:</strong> Assign to shows + return from shows<br/>
                                • <strong>Quantity Control:</strong> Specify exact quantities for all operations
                              </div>
                            </div>
                          </div>
                        </div>


                      </div>
                    </div>
                  )}

                  {/* Current Location Allocations Overview */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                          </svg>
                          <span className="text-lg font-medium text-slate-700">Location Allocations</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          {equipment?.quantity || 1} total items
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Current distribution across locations</p>
                    </div>
                    <div className="p-4">
                      {availabilityData ? (
                        <div className="space-y-3">
                          {/* Summary Stats - Clickable */}
                          <div className="grid grid-cols-6 gap-2 text-center bg-slate-50 p-4 rounded-lg">
                            {/* Debug info */}
                            {console.log('🔍 Availability Data for All Locations button:', {
                              total_allocated: availabilityData.total_allocated,
                              show_allocated: availabilityData.show_allocated,
                              installation_allocated: availabilityData.installation_allocated,
                              calculated_total: (availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0),
                              button_disabled: (availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0) === 0
                            })}
                            <button
                              onClick={() => handleShowAllocationDetail('total')}
                              className="group hover:bg-slate-100 rounded-lg p-2 transition-colors cursor-pointer"
                            >
                              <div className="text-xl font-bold text-slate-800 group-hover:text-slate-900">
                                {availabilityData.total_quantity}
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-slate-700">
                                Total
                              </div>
                            </button>
                            <button
                              onClick={() => handleShowAllocationDetail('inventory')}
                              className="group hover:bg-blue-50 rounded-lg p-2 transition-colors cursor-pointer"
                              disabled={!inventoryAllocations || inventoryAllocations.length === 0}
                            >
                              <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700">
                                {inventoryAllocations ? inventoryAllocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity_allocated) || 0), 0) : 0}
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-blue-600">
                                Location Allocations
                              </div>
                            </button>
                            <button
                              onClick={() => handleShowAllocationDetail('shows')}
                              className="group hover:bg-orange-50 rounded-lg p-2 transition-colors cursor-pointer"
                              disabled={(availabilityData.show_allocated || 0) === 0}
                            >
                              <div className="text-xl font-bold text-orange-600 group-hover:text-orange-700">
                                {availabilityData.show_allocated || 0}
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-orange-600">
                                In Shows
                              </div>
                            </button>
                            <button
                              onClick={() => handleShowAllocationDetail('installed')}
                              className="group hover:bg-purple-50 rounded-lg p-2 transition-colors cursor-pointer"
                              disabled={(availabilityData.installation_allocated || 0) === 0}
                            >
                              <div className="text-xl font-bold text-purple-600 group-hover:text-purple-700">
                                {availabilityData.installation_allocated || 0}
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-purple-600">
                                Installed
                              </div>
                            </button>
                            <button
                              onClick={() => handleShowAllocationDetail('available')}
                              className="group hover:bg-green-50 rounded-lg p-2 transition-colors cursor-pointer"
                              disabled={availabilityData.available_quantity === 0}
                            >
                              <div className={`text-xl font-bold ${availabilityData.available_quantity > 0 ? 'text-green-600 group-hover:text-green-700' : 'text-red-600'}`}>
                                {availabilityData.available_quantity}
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-green-600">
                                Available
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                console.log('🔍 All Locations button clicked!');
                                console.log('🔍 Calling handleShowAllocationDetail with "all"');
                                console.log('🔍 Button disabled state:', (availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0) === 0);
                                console.log('🔍 Availability data:', availabilityData);
                                handleShowAllocationDetail('all');
                              }}
                              className="group hover:bg-red-200 rounded-lg p-2 transition-colors cursor-pointer border-4 border-red-500"
                              disabled={false}
                            >
                              <div className="text-xl font-bold text-gray-600 group-hover:text-gray-700">
                                {(availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0)} 🔍TEST
                              </div>
                              <div className="text-xs text-slate-600 uppercase tracking-wide group-hover:text-gray-600">
                                All Locations 🔍TEST
                              </div>
                            </button>
                          </div>

                          {/* Detailed Allocation Breakdown */}
                          {(availabilityData.total_allocated > 0 || availabilityData.show_allocated > 0 || availabilityData.installation_allocated > 0) ? (
                            <div className="space-y-3">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                    </svg>
                                    <span className="text-sm font-medium text-blue-800">Equipment Allocated</span>
                                  </div>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {(availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0)} allocated
                                  </span>
                                </div>

                                {/* Visual Progress Bar */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                                    <span>Distribution</span>
                                    <span>{(availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0)} / {availabilityData.total_quantity}</span>
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-2">
                                    <div
                                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                                      style={{ width: `${((availabilityData.total_allocated || 0) + (availabilityData.show_allocated || 0)) / availabilityData.total_quantity * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <p className="text-sm text-blue-700">
                                  Items are distributed across locations and shows. Use the respective management sections to modify allocations.
                                </p>
                              </div>

                              {/* Complete allocation breakdown including shows and locations */}
                              {(inventoryAllocations && inventoryAllocations.length > 0) || (availabilityData && availabilityData.show_allocated > 0) ? (
                                <div className="bg-white border border-slate-200 rounded-lg p-3">
                                  <h4 className="text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Current Distribution</h4>
                                  <div className="space-y-2">
                                    {/* Show allocations with specific show names */}
                                    {showAllocations && showAllocations.length > 0 && showAllocations.map((allocation, index) => (
                                      <div key={`show-location-${index}`} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                          <span className="text-slate-700">
                                            {allocation.show_name}
                                            {allocation.venue && (
                                              <span className="text-xs text-slate-500 ml-1">@ {allocation.venue}</span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-slate-800">{allocation.quantity_allocated || allocation.quantity_needed || 0}</span>
                                          <span className="text-xs text-orange-600">
                                            ({allocation.status || 'allocated'})
                                          </span>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Fallback for show allocations without details */}
                                    {availabilityData && availabilityData.show_allocated > 0 && (!showAllocations || showAllocations.length === 0) && (
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                          <span className="text-slate-700">In Shows</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-slate-800">{availabilityData.show_allocated}</span>
                                          <span className="text-xs text-orange-600">(shows)</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Installation allocations with specific location */}
                                    {availabilityData && availabilityData.installation_allocated > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                          <span className="text-slate-700">
                                            Installed
                                            {equipment?.installation_location && (
                                              <span className="text-xs text-slate-500 ml-1">@ {equipment.installation_location}</span>
                                            )}
                                            {!equipment?.installation_location && equipment?.installation_location_id && currentLocationInfo?.isInstallation && (
                                              <span className="text-xs text-slate-500 ml-1">@ {currentLocationInfo.displayName}</span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-slate-800">{availabilityData.installation_allocated}</span>
                                          <span className="text-xs text-purple-600">
                                            ({equipment?.installation_type || 'fixed'})
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Location allocations */}
                                    {inventoryAllocations && inventoryAllocations.map((allocation, index) => (
                                      <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                          <span className="text-slate-700">{allocation.location_name}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-slate-800">{allocation.quantity_allocated}</span>
                                          <span className="text-xs text-slate-500">
                                            {allocation.status && allocation.status !== 'allocated' && `(${allocation.status})`}
                                          </span>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Available in default storage */}
                                    {availabilityData && availabilityData.available_quantity > 0 && (
                                      <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-2">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                          <span className="text-slate-700">Default Storage</span>
                                        </div>
                                        <span className="font-medium text-slate-800">{availabilityData.available_quantity}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : availabilityData && (availabilityData.total_allocated === 0 && availabilityData.show_allocated === 0 && availabilityData.installation_allocated === 0) ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-800">All Items in Default Storage</span>
                                </div>
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                  {availabilityData.total_quantity} items
                                </span>
                              </div>

                              <div className="mb-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-2 bg-gray-400 rounded-full w-full"></div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-700 mb-3">
                                {availabilityData.show_allocated > 0 ? (
                                  <>
                                    {availabilityData.available_quantity} of {availabilityData.total_quantity} items are in default storage.
                                    <span className="text-orange-600 ml-1">
                                      ({availabilityData.show_allocated} allocated to shows)
                                    </span>
                                  </>
                                ) : (
                                  `All ${availabilityData.total_quantity} items are currently in the default location.`
                                )}
                              </p>

                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="flex items-start">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div className="text-xs text-blue-800">
                                    <div className="font-medium mb-1">Ready for Allocation</div>
                                    <div>Use "Manage Locations & Installation" to distribute items across different locations and manage installations.</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-blue-800">Items Allocated</span>
                                </div>
                                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                                  {(availabilityData?.show_allocated || 0) + (availabilityData?.total_allocated || 0)} allocated
                                </span>
                              </div>
                              <p className="text-sm text-blue-700">
                                Equipment is allocated to shows, locations, or installations. Use the respective management sections to modify allocations.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="text-sm text-slate-600 mt-2">Loading allocation data...</p>
                        </div>
                      )}
                    </div>
                  </div>



                </div>


              )}

              {/* Show Allocations Tab */}
              {activeTab === 'allocations' && (
                <div className="space-y-6">
                  {/* Show Allocations Content */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="text-lg font-medium text-slate-800">Show Allocations</h3>
                      <p className="text-sm text-slate-600 mt-1">Equipment allocated to shows and events</p>
                    </div>
                    <div className="p-6">
                      {showAllocations && showAllocations.length > 0 ? (
                        <div className="space-y-4">
                          {showAllocations.map((allocation) => (
                            <div key={allocation.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800">{allocation.show_name}</div>
                                  <div className="text-sm text-slate-600 mt-1">{allocation.venue || 'No venue specified'}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {allocation.show_date ? new Date(allocation.show_date).toLocaleDateString() : 'No date specified'}
                                  </div>
                                  <div className="mt-2">
                                    <button
                                      onClick={() => handleStatusUpdate(allocation)}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${
                                        allocation.status === 'allocated' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                        allocation.status === 'checked-out' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                        allocation.status === 'in-use' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                        allocation.status === 'returned' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                                        allocation.status === 'requested' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                                        'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                      }`}
                                      title="Click to update status"
                                    >
                                      {allocation.status?.charAt(0).toUpperCase() + allocation.status?.slice(1).replace('-', ' ') || 'Unknown'}
                                      <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-lg font-bold text-orange-700">
                                    {allocation.quantity_allocated || allocation.quantity_needed || 0}
                                  </div>
                                  <div className="text-xs text-slate-600">items allocated</div>
                                  {allocation.quantity_needed && allocation.quantity_needed !== allocation.quantity_allocated && (
                                    <div className="text-xs text-slate-500 mt-1">
                                      ({allocation.quantity_needed} needed)
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Allocation Actions */}
                              <div className="mt-4 flex items-center justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReturnFromShow(allocation)}
                                  className="text-orange-600 hover:text-orange-700"
                                  title={`Return ${allocation.quantity_allocated || allocation.quantity_needed || 0} items from this show to storage`}
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  Return ({allocation.quantity_allocated || allocation.quantity_needed || 0})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAllocation(allocation)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <EditIcon className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveAllocation(allocation)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              </div>


                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-slate-500 mb-2">No show allocations</div>
                          <div className="text-sm text-slate-400">This equipment is not currently allocated to any shows</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


















































              )}

              {/* Movement History Tab */}
              {activeTab === 'history' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Movement History</h2>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                    <div className="mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">
                        Equipment movement log
                      </span>
                    </div>

                    <EquipmentLogList equipmentId={id} />
                  </div>
                </div>
              )}

              {/* Documents & Attachments Tab */}
              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Documents & Attachments</h2>
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto flex items-center"
                        onClick={() => setShowFileUploadModal(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Documents
                      </Button>
                    )}
                  </div>

                  {equipment.files && equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length}
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length === 1 ? ' file' : ' files'} attached
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'grid'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('grid')}
                          >
                            <CardViewIcon className="h-4 w-4" />
                          </button>
                          <button
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'list'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('list')}
                          >
                            <ListViewIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <FileGallery
                        files={equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id)}
                        layout={layout}
                        size="medium"
                        showDownload={true}
                        canDelete={false}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium mb-2">No documents attached to this equipment</p>
                      {(user?.role === 'admin' || user?.role === 'advanced') && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center mx-auto"
                            onClick={() => setShowFileUploadModal(true)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Documents
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Reference Image */}
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reference Image
              </h2>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              {referenceImage ? (
                <div className="w-full">
                  <div className="relative pb-4">
                    <img
                      src={getFileUrl(referenceImage.id, true)} /* Use thumbnail for better performance */
                      alt={`${equipment.brand} ${equipment.model}`}
                      className="w-full h-auto object-contain rounded-md"
                      onError={(e) => {
                        console.error('Error loading thumbnail, falling back to original image');
                        e.target.src = getFileUrl(referenceImage.id); // Fallback to original image
                        e.target.onerror = null;
                      }}
                    />
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <button
                        onClick={() => setShowReferenceImageModal(true)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                        title="Change reference image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    {referenceImage.file_name}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No reference image</p>
                  {(user?.role === 'admin' || user?.role === 'advanced') && (
                    <button
                      onClick={() => setShowReferenceImageModal(true)}
                      className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Reference Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Quick Info and Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Info */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 h-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick Info
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Category</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.category || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Type</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.type}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                </div>
                <div>
                  {equipment.status && (
                    <Badge variant={getStatusVariant(equipment.status)} size="md">
                      {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Quantity</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.quantity || 1} item{(equipment.quantity || 1) !== 1 ? 's' : ''}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Location</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.location || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Serial Number</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.serial_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <Card.Header className="bg-slate-50">
              <Card.Title className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Metadata
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created By</h4>
                    <p className="mt-1 text-sm text-slate-600">{equipment.created_by || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created At</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipment.created_at ? new Date(equipment.created_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Last Updated</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipment.updated_at ? new Date(equipment.updated_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                {equipment.locationDetails && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location Details
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg text-sm">
                      <p className="font-medium text-slate-800">{equipment.locationDetails.name}</p>
                      {equipment.locationDetails.street && (
                        <p className="text-slate-600 mt-1">{equipment.locationDetails.street}</p>
                      )}
                      {(equipment.locationDetails.postal_code || equipment.locationDetails.city) && (
                        <p className="text-slate-600">
                          {equipment.locationDetails.postal_code && `${equipment.locationDetails.postal_code} `}
                          {equipment.locationDetails.city}
                        </p>
                      )}
                      {(equipment.locationDetails.region || equipment.locationDetails.country) && (
                        <p className="text-slate-600">
                          {equipment.locationDetails.region && `${equipment.locationDetails.region}, `}
                          {equipment.locationDetails.country}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <ConfirmationDialogModern
          isOpen={showDeleteConfirmation}
          title="Delete Equipment"
          message="Are you sure you want to delete this equipment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDestructive
        />
      )}

      {/* Reference Image Modal */}
      <ReferenceImageModal
        isOpen={showReferenceImageModal}
        onClose={() => setShowReferenceImageModal(false)}
        equipmentId={id}
        existingImage={referenceImage}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        equipmentId={parseInt(id)}
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onSuccess={handleFileUploadSuccess}
      />

      {/* Allocate to Show Modal */}
      <AllocateToShowModal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        equipment={equipment}
        availabilityData={availabilityData}
      />

      {/* Allocation Edit Modal */}
      {editingAllocation && (
        <ShowEquipmentEditModal
          showEquipment={editingAllocation}
          showId={editingAllocation.show_id}
          onClose={handleAllocationEditClose}
        />
      )}



      {/* Location Allocation Manager Modal */}
      <LocationAllocationManager
        isOpen={showLocationAllocationModal}
        onClose={() => setShowLocationAllocationModal(false)}
        equipment={equipment}
        locations={locationsArray}
      />

      {/* Allocation Detail Modal */}
      {showAllocationDetailModal && allocationDetailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${
                    allocationDetailData.color === 'blue' ? 'bg-blue-100' :
                    allocationDetailData.color === 'orange' ? 'bg-orange-100' :
                    allocationDetailData.color === 'purple' ? 'bg-purple-100' :
                    'bg-slate-100'
                  }`}>
                    {allocationDetailData.icon === 'location' && (
                      <svg className={`w-5 h-5 ${
                        allocationDetailData.color === 'blue' ? 'text-blue-600' :
                        allocationDetailData.color === 'orange' ? 'text-orange-600' :
                        allocationDetailData.color === 'purple' ? 'text-purple-600' :
                        'text-slate-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {allocationDetailData.icon === 'show' && (
                      <svg className={`w-5 h-5 ${
                        allocationDetailData.color === 'blue' ? 'text-blue-600' :
                        allocationDetailData.color === 'orange' ? 'text-orange-600' :
                        allocationDetailData.color === 'purple' ? 'text-purple-600' :
                        'text-slate-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                      </svg>
                    )}
                    {allocationDetailData.icon === 'installation' && (
                      <svg className={`w-5 h-5 ${
                        allocationDetailData.color === 'blue' ? 'text-blue-600' :
                        allocationDetailData.color === 'orange' ? 'text-orange-600' :
                        allocationDetailData.color === 'purple' ? 'text-purple-600' :
                        'text-slate-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{allocationDetailData.title}</h3>
                    <p className="text-sm text-slate-600">
                      {allocationDetailData.totalCount} {allocationDetailData.totalCount === 1 ? 'item' : 'items'} allocated
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllocationDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {allocationDetailData.items && allocationDetailData.items.length > 0 ? (
                <div className="space-y-3">
                  {allocationDetailData.items.map((item, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      allocationDetailData.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                      allocationDetailData.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                      allocationDetailData.color === 'purple' ? 'bg-purple-50 border-purple-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">
                            {item.location_name || item.show_name || 'Unknown Location'}
                          </div>
                          {/* Show allocation type for combined locations popup */}
                          {item.display_type && (
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                              {item.display_type}
                            </div>
                          )}
                          {item.venue && (
                            <div className="text-sm text-slate-600 mt-1">{item.venue}</div>
                          )}
                          {item.show_date && (
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(item.show_date).toLocaleDateString()}
                            </div>
                          )}
                          {item.type && (
                            <div className="text-xs text-slate-500 mt-1">
                              Installation Type: {item.type}
                            </div>
                          )}
                          {item.installation_date && (
                            <div className="text-xs text-slate-500 mt-1">
                              Installed: {new Date(item.installation_date).toLocaleDateString()}
                            </div>
                          )}
                          {item.installation_notes && (
                            <div className="text-xs text-slate-500 mt-1">
                              Notes: {item.installation_notes}
                            </div>
                          )}
                          {item.status && (
                            <div className="mt-2">
                              {item.allocation_type === 'show' ? (
                                <button
                                  onClick={() => {
                                    // Find the full allocation object for show allocations
                                    const fullAllocation = showAllocations?.find(a => a.show_name === item.location_name);
                                    if (fullAllocation) {
                                      handleStatusUpdate(fullAllocation);
                                      // Keep the allocation detail modal open - it will refresh after status update
                                    }
                                  }}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-80 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md ${
                                    item.status === 'allocated' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                    item.status === 'checked-out' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                    item.status === 'in-use' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                    item.status === 'requested' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                                    item.status === 'installed' ? 'bg-purple-100 text-purple-800' :
                                    'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                  }`}
                                  title="Click to update show allocation status"
                                >
                                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1).replace('-', ' ')}
                                  <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                                  item.status === 'checked-out' ? 'bg-orange-100 text-orange-800' :
                                  item.status === 'in-use' ? 'bg-green-100 text-green-800' :
                                  item.status === 'installed' ? 'bg-purple-100 text-purple-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1).replace('-', ' ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-lg font-bold ${
                            allocationDetailData.color === 'blue' ? 'text-blue-700' :
                            allocationDetailData.color === 'orange' ? 'text-orange-700' :
                            allocationDetailData.color === 'purple' ? 'text-purple-700' :
                            'text-slate-700'
                          }`}>
                            {item.quantity_allocated || item.quantity_needed || 0}
                          </div>
                          <div className="text-xs text-slate-600">items</div>
                          {item.quantity_needed && item.quantity_needed !== item.quantity_allocated && (
                            <div className="text-xs text-slate-500 mt-1">
                              ({item.quantity_needed} needed)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-500 mb-2">No allocations found</div>
                  <div className="text-sm text-slate-400">
                    This equipment is not currently allocated to any {allocationDetailType}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <div>Total: {allocationDetailData.totalCount} {allocationDetailData.totalCount === 1 ? 'item' : 'items'}</div>
                  {allocationDetailData.items?.some(item => item.allocation_type === 'show') && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Click show status badges to update
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAllocationDetailModal(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusUpdateModal && selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Update Status</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedAllocation.show_name} - {selectedAllocation.quantity_allocated || selectedAllocation.quantity_needed || 0} items
                  </p>
                </div>
                <button
                  onClick={() => setShowStatusUpdateModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-3">
                <div className="text-sm text-slate-600 mb-4">
                  Current status: <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedAllocation.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                    selectedAllocation.status === 'checked-out' ? 'bg-orange-100 text-orange-800' :
                    selectedAllocation.status === 'in-use' ? 'bg-green-100 text-green-800' :
                    selectedAllocation.status === 'requested' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {selectedAllocation.status?.charAt(0).toUpperCase() + selectedAllocation.status?.slice(1).replace('-', ' ')}
                  </span>
                </div>

                {/* Status Options */}
                <div className="grid grid-cols-2 gap-3">
                  {['requested', 'allocated', 'checked-out', 'in-use', 'returned'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        updateStatusMutation.mutate({
                          allocationId: selectedAllocation.id,
                          status: status
                        });
                      }}
                      disabled={selectedAllocation.status === status || updateStatusMutation.isLoading}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedAllocation.status === status
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : updateStatusMutation.isLoading
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : status === 'requested' ? 'border-purple-200 text-purple-700 hover:bg-purple-50' :
                            status === 'allocated' ? 'border-blue-200 text-blue-700 hover:bg-blue-50' :
                            status === 'checked-out' ? 'border-orange-200 text-orange-700 hover:bg-orange-50' :
                            status === 'in-use' ? 'border-green-200 text-green-700 hover:bg-green-50' :
                            status === 'returned' ? 'border-gray-200 text-gray-700 hover:bg-gray-50' :
                            'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {updateStatusMutation.isLoading ? 'Updating...' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowStatusUpdateModal(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EquipmentDetailsModern;