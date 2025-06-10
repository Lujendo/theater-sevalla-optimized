import React from 'react';
import { Badge } from './ui';

const InstallationTab = ({ equipment, user }) => {
  // Installation type badge variants
  const getInstallationTypeVariant = (type) => {
    switch (type) {
      case 'fixed':
        return 'destructive'; // Red for fixed
      case 'semi-permanent':
        return 'warning'; // Orange for semi-permanent
      case 'portable':
      default:
        return 'success'; // Green for portable
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Check if equipment can be allocated to shows
  const canAllocateToShows = equipment?.installation_type === 'portable';

  // Calculate maintenance status
  const getMaintenanceStatus = () => {
    if (!equipment?.next_maintenance_date) return null;
    
    const nextDate = new Date(equipment.next_maintenance_date);
    const today = new Date();
    const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { status: 'overdue', days: Math.abs(daysUntil), variant: 'destructive' };
    } else if (daysUntil <= 7) {
      return { status: 'due-soon', days: daysUntil, variant: 'warning' };
    } else if (daysUntil <= 30) {
      return { status: 'upcoming', days: daysUntil, variant: 'secondary' };
    } else {
      return { status: 'scheduled', days: daysUntil, variant: 'success' };
    }
  };

  const maintenanceStatus = getMaintenanceStatus();

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="bg-purple-100 p-2 rounded-lg mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Installation & Maintenance</h2>
      </div>

      {/* Installation Type & Status */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-800">Installation Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Installation Type */}
            <div>
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Installation Type</span>
              </div>
              <Badge variant={getInstallationTypeVariant(equipment?.installation_type)} size="lg">
                {equipment?.installation_type?.charAt(0).toUpperCase() + equipment?.installation_type?.slice(1).replace('-', ' ') || 'Portable'}
              </Badge>
              <div className="mt-2 text-sm text-slate-600">
                {equipment?.installation_type === 'fixed' && 'Permanently installed equipment that cannot be moved'}
                {equipment?.installation_type === 'semi-permanent' && 'Equipment that can be moved with special approval'}
                {(equipment?.installation_type === 'portable' || !equipment?.installation_type) && 'Equipment that can be freely moved and allocated to shows'}
              </div>
            </div>

            {/* Show Allocation Status */}
            <div>
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Show Allocation</span>
              </div>
              <Badge variant={canAllocateToShows ? 'success' : 'secondary'} size="lg">
                {canAllocateToShows ? 'Can Allocate' : 'Fixed Installation'}
              </Badge>
              <div className="mt-2 text-sm text-slate-600">
                {canAllocateToShows 
                  ? 'This equipment can be allocated to shows and moved as needed'
                  : 'This equipment cannot be allocated to shows due to fixed installation'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Details (for fixed/semi-permanent equipment) */}
      {(equipment?.installation_type === 'fixed' || equipment?.installation_type === 'semi-permanent') && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-800">Installation Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Installation Location */}
              <div>
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Installation Location</span>
                </div>
                <p className="text-base text-slate-800">
                  {equipment?.installation_location || 'Not specified'}
                </p>
              </div>

              {/* Installation Date */}
              <div>
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Installation Date</span>
                </div>
                <p className="text-base text-slate-800">
                  {formatDate(equipment?.installation_date)}
                </p>
              </div>
            </div>

            {/* Installation Notes */}
            {equipment?.installation_notes && (
              <div className="mt-6">
                <div className="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Installation Notes</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-base text-slate-800 whitespace-pre-line">
                    {equipment.installation_notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Information */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">Maintenance Schedule</h3>
            {maintenanceStatus && (
              <Badge variant={maintenanceStatus.variant} size="sm">
                {maintenanceStatus.status === 'overdue' && `${maintenanceStatus.days} days overdue`}
                {maintenanceStatus.status === 'due-soon' && `Due in ${maintenanceStatus.days} days`}
                {maintenanceStatus.status === 'upcoming' && `Due in ${maintenanceStatus.days} days`}
                {maintenanceStatus.status === 'scheduled' && `Due in ${maintenanceStatus.days} days`}
              </Badge>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Maintenance Schedule */}
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Schedule</span>
              </div>
              <p className="text-base text-slate-800">
                {equipment?.maintenance_schedule || 'Not scheduled'}
              </p>
            </div>

            {/* Last Maintenance */}
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Last Maintenance</span>
              </div>
              <p className="text-base text-slate-800">
                {formatDate(equipment?.last_maintenance_date)}
              </p>
            </div>

            {/* Next Maintenance */}
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">Next Maintenance</span>
              </div>
              <p className={`text-base ${maintenanceStatus?.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-800'}`}>
                {formatDate(equipment?.next_maintenance_date)}
              </p>
            </div>
          </div>

          {/* Maintenance Status Alert */}
          {maintenanceStatus && maintenanceStatus.status === 'overdue' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Maintenance Overdue</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This equipment's maintenance is {maintenanceStatus.days} days overdue. Please schedule maintenance as soon as possible.
                  </p>
                </div>
              </div>
            </div>
          )}

          {maintenanceStatus && maintenanceStatus.status === 'due-soon' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Maintenance Due Soon</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This equipment's maintenance is due in {maintenanceStatus.days} days. Please plan accordingly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallationTab;
