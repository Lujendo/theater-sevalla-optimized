import React, { useState } from 'react';
import { Card, Button, Input } from '../components/ui';
import { ShowListIcon, AddIcon, ViewIcon, EditIcon, TrashIcon } from '../components/Icons';

const ShowList = () => {
  const [shows, setShows] = useState([
    {
      id: 1,
      name: "Romeo and Juliet",
      date: "2024-07-15",
      venue: "Main Theater",
      director: "John Smith",
      status: "planning",
      equipmentCount: 0
    },
    {
      id: 2,
      name: "The Tempest",
      date: "2024-08-20",
      venue: "Studio Theater",
      director: "Jane Doe",
      status: "in-progress",
      equipmentCount: 15
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
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
      const show = {
        id: Date.now(),
        ...newShow,
        status: 'planning',
        equipmentCount: 0
      };
      setShows([...shows, show]);
      setNewShow({ name: '', date: '', venue: '', director: '', description: '' });
      setShowCreateModal(false);
    }
  };

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
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <AddIcon className="w-4 h-4" />
          <span>Create New Show</span>
        </Button>
      </div>

      {/* Shows Grid */}
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
                  className="flex-1 flex items-center justify-center space-x-1"
                >
                  <ViewIcon className="w-4 h-4" />
                  <span>View</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 flex items-center justify-center space-x-1"
                >
                  <EditIcon className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center justify-center px-3"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </Card.Footer>
          </Card>
        ))}

        {/* Empty State */}
        {shows.length === 0 && (
          <div className="col-span-full">
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
          </div>
        )}
      </div>

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
                disabled={!newShow.name || !newShow.date}
              >
                Create Show
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowList;
