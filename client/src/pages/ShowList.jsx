import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card, Button, Input } from '../components/ui';
import { ShowListIcon, AddIcon, ViewIcon, EditIcon, TrashIcon, ListViewIcon, CardViewIcon } from '../components/Icons';
import { getShows, createShow, updateShow, deleteShow } from '../services/showService';

const ShowList = () => {
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
    setSelectedShow(show);
    setShowDetailModal(true);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-3">
            <ShowListIcon className="w-8 h-8 text-primary-600" />
            <span>Show List</span>
          </h1>
          <p className="text-slate-600 mt-1">
            Manage theater shows and their equipment allocations
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
            <span>Create New Show</span>
          </Button>
        </div>
      </div>

      {/* Shows Display */}
      {shows.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-12">
          <Card.Body>
            <ShowListIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No shows yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first show to start managing equipment allocations
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create New Show
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
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Show</th>
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
                        <span className="font-medium text-primary-600">{show.equipmentCount}</span>
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
                    <span className="font-medium text-primary-600">{show.equipmentCount}</span>
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Create New Show</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Show Name *
                </label>
                <Input
                  value={newShow.name}
                  onChange={(e) => setNewShow({ ...newShow, name: e.target.value })}
                  placeholder="Enter show name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <Input
                  type="date"
                  value={newShow.date}
                  onChange={(e) => setNewShow({ ...newShow, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Venue
                </label>
                <Input
                  value={newShow.venue}
                  onChange={(e) => setNewShow({ ...newShow, venue: e.target.value })}
                  placeholder="Enter venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Director
                </label>
                <Input
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
                      <Button className="w-full" disabled>
                        Manage Equipment (Coming Soon)
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
                          Show Name *
                        </label>
                        <Input
                          value={editingShow.name}
                          onChange={(e) => setEditingShow({ ...editingShow, name: e.target.value })}
                          placeholder="Enter show name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date *
                        </label>
                        <Input
                          type="date"
                          value={editingShow.date}
                          onChange={(e) => setEditingShow({ ...editingShow, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Venue
                        </label>
                        <Input
                          value={editingShow.venue}
                          onChange={(e) => setEditingShow({ ...editingShow, venue: e.target.value })}
                          placeholder="Enter venue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Director
                        </label>
                        <Input
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
