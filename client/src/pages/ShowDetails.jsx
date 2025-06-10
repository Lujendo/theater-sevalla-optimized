import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Card, Button, Input } from '../components/ui';
import { ChevronLeftIcon, EditIcon, TrashIcon } from '../components/Icons';
import { getShow, updateShow, deleteShow } from '../services/showService';
import ManageEquipment from './ManageEquipment';

const ShowDetails = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    date: '',
    venue: '',
    director: '',
    description: '',
    status: 'planning'
  });

  // Fetch show details
  const { data: show, isLoading, error } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => getShow(showId),
    onSuccess: (data) => {
      setEditData({
        name: data.name || '',
        date: data.date ? data.date.split('T')[0] : '',
        venue: data.venue || '',
        director: data.director || '',
        description: data.description || '',
        status: data.status || 'planning'
      });
    },
    onError: (error) => {
      toast.error(`Failed to load show: ${error.message}`);
    }
  });

  // Update show mutation
  const updateShowMutation = useMutation({
    mutationFn: (data) => updateShow(showId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['show', showId]);
      queryClient.invalidateQueries(['shows']);
      toast.success('Show updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Failed to update show: ${error.message}`);
    }
  });

  // Delete show mutation
  const deleteShowMutation = useMutation({
    mutationFn: () => deleteShow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries(['shows']);
      toast.success('Show deleted successfully');
      navigate('/show-list');
    },
    onError: (error) => {
      toast.error(`Failed to delete show: ${error.message}`);
    }
  });

  const handleEdit = () => {
    if (show) {
      setEditData({
        name: show.name || '',
        date: show.date ? show.date.split('T')[0] : '',
        venue: show.venue || '',
        director: show.director || '',
        description: show.description || '',
        status: show.status || 'planning'
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editData.name && editData.date) {
      updateShowMutation.mutate(editData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this show?')) {
      deleteShowMutation.mutate();
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'planning': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading show details...</p>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Show not found</div>
          <p className="text-slate-600 mb-4">{error?.message || 'Show not found'}</p>
          <Button onClick={() => navigate('/show-list')}>
            Back to Production Lists
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
            <h1 className="text-2xl font-bold text-slate-800">{show.name}</h1>
            <p className="text-slate-600">{new Date(show.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(show.status)}
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex items-center space-x-2"
              >
                <EditIcon className="w-4 h-4" />
                <span>Edit</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteShowMutation.isLoading}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Show Details
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'equipment'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Equipment Management
            {show.equipmentCount > 0 && (
              <span className="ml-2 bg-primary-100 text-primary-600 py-0.5 px-2 rounded-full text-xs">
                {show.equipmentCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-slate-800">Show Information</h2>
          </Card.Header>
          <Card.Body>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Show Name *
                    </label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Enter show name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date *
                    </label>
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Venue
                    </label>
                    <Input
                      value={editData.venue}
                      onChange={(e) => setEditData({ ...editData, venue: e.target.value })}
                      placeholder="Enter venue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Director
                    </label>
                    <Input
                      value={editData.director}
                      onChange={(e) => setEditData({ ...editData, director: e.target.value })}
                      placeholder="Enter director name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows="4"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter show description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!editData.name || !editData.date || updateShowMutation.isLoading}
                  >
                    {updateShowMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Show Name</h3>
                    <p className="mt-1 text-lg text-slate-900">{show.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Date</h3>
                    <p className="mt-1 text-lg text-slate-900">{new Date(show.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Venue</h3>
                    <p className="mt-1 text-lg text-slate-900">{show.venue || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Director</h3>
                    <p className="mt-1 text-lg text-slate-900">{show.director || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Status</h3>
                    <div className="mt-1">{getStatusBadge(show.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Equipment Count</h3>
                    <p className="mt-1 text-lg text-slate-900">{show.equipmentCount || 0} items</p>
                  </div>
                </div>
                {show.description && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Description</h3>
                    <p className="mt-1 text-slate-900">{show.description}</p>
                  </div>
                )}
                {show.creator && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Created By</h3>
                    <p className="mt-1 text-slate-900">{show.creator.username}</p>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'equipment' && (
        <ManageEquipment />
      )}
    </div>
  );
};

export default ShowDetails;
