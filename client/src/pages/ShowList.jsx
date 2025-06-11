import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card, Button, Input, Select } from '../components/ui';
import { ShowListIcon, AddIcon, ViewIcon, EditIcon, TrashIcon, ListViewIcon, CardViewIcon } from '../components/Icons';
import { getShows, createShow, updateShow, deleteShow, getShowEquipment } from '../services/showService';
import { getLocations } from '../services/locationService';
import axios from 'axios';

const ShowList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch shows
  const { data: showsData, isLoading, error } = useQuery({
    queryKey: ['shows'],
    queryFn: () => getShows(),
    onError: (error) => {
      toast.error(`Failed to load shows: ${error.message}`);
    }
  });

  const shows = showsData?.shows || [];

  // Fetch locations for venue dropdown
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => getLocations(),
    onError: (error) => {
      console.error('Failed to load locations:', error);
    }
  });

  // Fetch missing equipment data for all shows
  const { data: missingEquipmentData } = useQuery({
    queryKey: ['showsMissingEquipment'],
    queryFn: async () => {
      const missingData = {};

      // Fetch equipment data for each show
      for (const show of shows) {
        try {
          const equipmentResponse = await getShowEquipment(show.id);
          const equipment = equipmentResponse?.equipment || [];

          // Calculate missing equipment for this show
          const missingItems = equipment.reduce((acc, item) => {
            const needed = parseInt(item.quantity_needed) || 0;
            const allocated = parseInt(item.quantity_allocated) || 0;
            const missing = Math.max(0, needed - allocated);

            if (missing > 0) {
              acc.items.push({
                id: item.id,
                equipment_id: item.equipment_id,
                name: item.equipment?.name || item.equipment?.type,
                brand: item.equipment?.brand,
                model: item.equipment?.model,
                missing: missing,
                needed: needed,
                allocated: allocated
              });
              acc.totalMissing += missing;
            }
            return acc;
          }, { items: [], totalMissing: 0 });

          missingData[show.id] = missingItems;
        } catch (error) {
          console.error(`Failed to fetch equipment for show ${show.id}:`, error);
          missingData[show.id] = { items: [], totalMissing: 0 };
        }
      }

      return missingData;
    },
    enabled: shows.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const locations = locationsData?.locations || [];

  // Create show mutation
  const createShowMutation = useMutation({
    mutationFn: createShow,
    onSuccess: () => {
      queryClient.invalidateQueries(['shows']);
      toast.success('Show created successfully');
      setShowCreateModal(false);
      setNewShow({ name: '', date: '', venue: '', director: '', description: '' });
    },
    onError: (error) => {
      toast.error(`Failed to create show: ${error.message}`);
    }
  });

  // Update show mutation
  const updateShowMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateShow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shows']);
      toast.success('Show updated successfully');
      setShowEditModal(false);
      setEditingShow(null);
    },
    onError: (error) => {
      toast.error(`Failed to update show: ${error.message}`);
    }
  });

  // Delete show mutation
  const deleteShowMutation = useMutation({
    mutationFn: deleteShow,
    onSuccess: () => {
      queryClient.invalidateQueries(['shows']);
      toast.success('Show deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete show: ${error.message}`);
    }
  });

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [newShow, setNewShow] = useState({
    name: '',
    date: '',
    venue: '',
    director: '',
    description: ''
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateShow = () => {
    if (newShow.name && newShow.date) {
      createShowMutation.mutate(newShow);
    }
  };

  const handleViewShow = (show) => {
    navigate(`/show/${show.id}`);
  };

  const handleEditShow = (show) => {
    setEditingShow({ ...show });
    setShowEditModal(true);
  };

  const handleUpdateShow = () => {
    if (editingShow.name && editingShow.date) {
      updateShowMutation.mutate(editingShow);
    }
  };

  const handleDeleteShow = (showId) => {
    if (window.confirm('Are you sure you want to delete this show?')) {
      deleteShowMutation.mutate(showId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading shows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Error loading shows</div>
          <p className="text-slate-600 mb-4">{error.message}</p>
          <Button onClick={() => queryClient.invalidateQueries(['shows'])}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Calculate overall missing equipment summary
  const overallMissingSummary = Object.entries(missingEquipmentData || {}).reduce((acc, [showId, data]) => {
    if (data.totalMissing > 0) {
      const show = shows.find(s => s.id.toString() === showId);
      if (show) {
        acc.showsWithMissing.push({
          show: show,
          missing: data.totalMissing,
          items: data.items
        });
        acc.totalMissingItems += data.totalMissing;
      }
    }
    return acc;
  }, { showsWithMissing: [], totalMissingItems: 0 });

  return (
    <div className="space-y-6">
      {/* Missing Equipment Alert */}
      {overallMissingSummary.totalMissingItems > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Missing Equipment Alert
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-3">
                  <strong>{overallMissingSummary.totalMissingItems}</strong> equipment items are missing across <strong>{overallMissingSummary.showsWithMissing.length}</strong> production{overallMissingSummary.showsWithMissing.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-2">
                  {overallMissingSummary.showsWithMissing.map(({ show, missing }) => (
                    <div key={show.id} className="flex items-center justify-between bg-red-100 rounded px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/show/${show.id}`)}
                          className="font-medium text-red-800 hover:text-red-900 hover:underline"
                          title="View production details"
                        >
                          {show.name}
                        </button>
                        <span className="text-red-600 text-xs">
                          {show.venue} • {new Date(show.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-red-200 text-red-800 px-2 py-1 rounded font-bold text-xs">
                        {missing} missing
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Navigate to the first show with missing equipment
                      if (overallMissingSummary.showsWithMissing.length > 0) {
                        navigate(`/show/${overallMissingSummary.showsWithMissing[0].show.id}`);
                      }
                    }}
                    className="bg-white text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Review First Show
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/equipment')}
                    className="bg-white text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Check Equipment Inventory
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-3">
            <ShowListIcon className="w-8 h-8 text-primary-600" />
            <span>Production Lists</span>
          </h1>
          <p className="text-slate-600 mt-1">
            Manage theater productions and their equipment allocations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="List View"
            >
              <ListViewIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Card View"
            >
              <CardViewIcon className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <AddIcon className="w-4 h-4" />
            <span>Create New Production</span>
          </Button>
        </div>
      </div>

      {/* Shows Display */}
      {shows.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-12">
          <Card.Body>
            <ShowListIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No productions yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first production to start managing equipment allocations
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create New Production
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
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Production</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Venue</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Director</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Equipment</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {shows.map((show) => (
                    <tr
                      key={show.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleViewShow(show)}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{show.name}</div>
                          {show.description && (
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {show.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(show.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{show.venue}</td>
                      <td className="py-3 px-4 text-slate-600">{show.director}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(show.status)}`}>
                          {show.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-primary-600">{show.equipmentCount}</span>
                          {missingEquipmentData?.[show.id]?.totalMissing > 0 && (
                            <div className="flex items-center space-x-1">
                              <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span>{missingEquipmentData[show.id].totalMissing} missing</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewShow(show)}
                            className="p-1"
                            title="View"
                          >
                            <ViewIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditShow(show)}
                            className="p-1"
                            title="Edit"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/show/${show.id}`)}
                            className="p-1"
                            title="View Details"
                          >
                            <ViewIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteShow(show.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
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
          {shows.map((show) => (
            <Card key={show.id} className="hover:shadow-lg transition-shadow">
              <Card.Header>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{show.name}</h3>
                    <p className="text-sm text-slate-600">{show.venue}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(show.status)}`}>
                    {show.status}
                  </span>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Date:</span>
                    <span className="font-medium">{new Date(show.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Director:</span>
                    <span className="font-medium">{show.director}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Equipment Items:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-primary-600">{show.equipmentCount}</span>
                      {missingEquipmentData?.[show.id]?.totalMissing > 0 && (
                        <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>{missingEquipmentData[show.id].totalMissing} missing</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewShow(show)}
                    className="flex-1 flex items-center justify-center space-x-1"
                  >
                    <ViewIcon className="w-4 h-4" />
                    <span>View</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditShow(show)}
                    className="flex-1 flex items-center justify-center space-x-1"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/show/${show.id}`)}
                    className="flex-1 flex items-center justify-center space-x-1"
                  >
                    <ViewIcon className="w-4 h-4" />
                    <span>Details</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteShow(show.id)}
                    className="flex items-center justify-center px-3 text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      {/* Create Show Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Create New Production</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Production Name *
                </label>
                <Input
                  id="newShowName"
                  name="newShowName"
                  value={newShow.name}
                  onChange={(e) => setNewShow({ ...newShow, name: e.target.value })}
                  placeholder="Enter production name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <Input
                  id="newShowDate"
                  name="newShowDate"
                  type="date"
                  value={newShow.date}
                  onChange={(e) => setNewShow({ ...newShow, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Venue
                </label>
                <Select
                  id="newShowVenue"
                  name="newShowVenue"
                  value={newShow.venue}
                  onChange={(e) => setNewShow({ ...newShow, venue: e.target.value })}
                  options={[
                    { value: '', label: 'Select Venue' },
                    ...locations.map((location) => {
                      let label = location.name;
                      const addressParts = [];

                      if (location.city) addressParts.push(location.city);
                      if (location.region) addressParts.push(location.region);
                      if (location.country) addressParts.push(location.country);

                      if (addressParts.length > 0) {
                        label += ` (${addressParts.join(', ')})`;
                      }

                      return {
                        value: location.name,
                        label: label,
                      };
                    })
                  ]}
                  disabled={locationsLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Director
                </label>
                <Input
                  id="newShowDirector"
                  name="newShowDirector"
                  value={newShow.director}
                  onChange={(e) => setNewShow({ ...newShow, director: e.target.value })}
                  placeholder="Enter director name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newShow.description}
                  onChange={(e) => setNewShow({ ...newShow, description: e.target.value })}
                  placeholder="Enter show description"
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateShow}
                className="flex-1"
                disabled={!newShow.name || !newShow.date || createShowMutation.isLoading}
              >
                {createShowMutation.isLoading ? 'Creating...' : 'Create Show'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show Detail Modal */}
      {showDetailModal && selectedShow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedShow.name}</h2>
                  <p className="text-slate-600 mt-1">{selectedShow.venue}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedShow.status)}`}>
                    {selectedShow.status}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                    className="text-slate-500"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Show Information</h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <p className="text-slate-900">{new Date(selectedShow.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Director</label>
                        <p className="text-slate-900">{selectedShow.director || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <p className="text-slate-900">{selectedShow.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Equipment Summary</h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <div className="text-3xl font-bold text-primary-600 mb-2">
                          {selectedShow.equipmentCount}
                        </div>
                        <p className="text-slate-600">Equipment Items Allocated</p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/show/${selectedShow.id}`)}
                      >
                        View Full Details
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditShow(selectedShow);
                  }}
                  className="flex items-center space-x-2"
                >
                  <EditIcon className="w-4 h-4" />
                  <span>Edit Show</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Edit Modal */}
      {showEditModal && editingShow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Edit Show</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-500"
                >
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Production Name *
                        </label>
                        <Input
                          id="editShowName"
                          name="editShowName"
                          value={editingShow.name}
                          onChange={(e) => setEditingShow({ ...editingShow, name: e.target.value })}
                          placeholder="Enter production name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date *
                        </label>
                        <Input
                          id="editShowDate"
                          name="editShowDate"
                          type="date"
                          value={editingShow.date}
                          onChange={(e) => setEditingShow({ ...editingShow, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Venue
                        </label>
                        <Select
                          id="editShowVenue"
                          name="editShowVenue"
                          value={editingShow.venue}
                          onChange={(e) => setEditingShow({ ...editingShow, venue: e.target.value })}
                          options={[
                            { value: '', label: 'Select Venue' },
                            ...locations.map((location) => {
                              let label = location.name;
                              const addressParts = [];

                              if (location.city) addressParts.push(location.city);
                              if (location.region) addressParts.push(location.region);
                              if (location.country) addressParts.push(location.country);

                              if (addressParts.length > 0) {
                                label += ` (${addressParts.join(', ')})`;
                              }

                              return {
                                value: location.name,
                                label: label,
                              };
                            })
                          ]}
                          disabled={locationsLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Director
                        </label>
                        <Input
                          id="editShowDirector"
                          name="editShowDirector"
                          value={editingShow.director}
                          onChange={(e) => setEditingShow({ ...editingShow, director: e.target.value })}
                          placeholder="Enter director name"
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Additional Details</h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editingShow.status}
                          onChange={(e) => setEditingShow({ ...editingShow, status: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="planning">Planning</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editingShow.description}
                          onChange={(e) => setEditingShow({ ...editingShow, description: e.target.value })}
                          placeholder="Enter show description"
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          rows="6"
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateShow}
                  disabled={!editingShow.name || !editingShow.date || updateShowMutation.isLoading}
                  className="flex items-center space-x-2"
                >
                  <span>{updateShowMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowList;
