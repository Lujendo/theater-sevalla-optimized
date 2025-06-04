import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  EquipmentIcon,
  AdminIcon,
  SettingsIcon,
  AddIcon,
  MenuIcon,
  ChevronLeftIcon,
  LogsIcon
} from './Icons';

// Temporary ChevronRightIcon until we can update the Icons component
const ChevronRightIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const Sidebar = ({ isOpen, isCollapsed, toggleSidebar, toggleCollapse }) => {
  const { isAdmin, isAdvanced } = useAuth();
  const location = useLocation();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isOpen) {
        toggleSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, toggleSidebar]);

  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => toggleSidebar(false)}
          style={{ opacity: isOpen ? 1 : 0 }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${!isOpen ? 'sidebar-hidden' : ''} ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
      >
        <div className="flex justify-between items-center px-4 py-2">
          {!isCollapsed && (
            <span className="text-lg font-semibold text-slate-800">Navigation</span>
          )}
          <div className="flex">
            {/* Collapse toggle button */}
            <button
              onClick={() => toggleCollapse(!isCollapsed)}
              className="sidebar-collapse-btn"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            </button>

            {/* Sidebar toggle button (mobile only) */}
            <button
              onClick={() => toggleSidebar(!isOpen)}
              className="sidebar-toggle-btn md:hidden"
              aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <MenuIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/dashboard"
            className={`sidebar-nav-item ${isActive('/dashboard') ? 'sidebar-nav-item-active' : ''}`}
            onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
            title="Dashboard"
          >
            <DashboardIcon className="sidebar-nav-icon" />
            <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
              Dashboard
            </span>
          </Link>

          <Link
            to="/equipment"
            className={`sidebar-nav-item ${isActive('/equipment') ? 'sidebar-nav-item-active' : ''}`}
            onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
            title="Equipment"
          >
            <EquipmentIcon className="sidebar-nav-icon" />
            <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
              Equipment
            </span>
          </Link>

          {/* Admin-only links */}
          {isAdmin() && (
            <>
              <Link
                to="/admin"
                className={`sidebar-nav-item ${isActive('/admin') ? 'sidebar-nav-item-active' : ''}`}
                onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
                title="Admin"
              >
                <AdminIcon className="sidebar-nav-icon" />
                <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
                  Admin
                </span>
              </Link>

              <Link
                to="/equipment-logs"
                className={`sidebar-nav-item ${isActive('/equipment-logs') ? 'sidebar-nav-item-active' : ''}`}
                onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
                title="Equipment Logs"
              >
                <LogsIcon className="sidebar-nav-icon" />
                <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
                  Equipment Logs
                </span>
              </Link>
            </>
          )}

          {/* Admin or Advanced user links */}
          {(isAdmin() || isAdvanced()) && (
            <Link
              to="/equipment/new"
              className={`sidebar-nav-item ${isActive('/equipment/new') ? 'sidebar-nav-item-active' : ''}`}
              onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
              title="Add Equipment"
            >
              <AddIcon className="sidebar-nav-icon" />
              <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
                Add Equipment
              </span>
            </Link>
          )}

          <Link
            to="/settings"
            className={`sidebar-nav-item ${isActive('/settings') ? 'sidebar-nav-item-active' : ''}`}
            onClick={() => window.innerWidth < 768 && toggleSidebar(false)}
            title="Settings"
          >
            <SettingsIcon className="sidebar-nav-icon" />
            <span className={`sidebar-nav-text ${isCollapsed ? 'hidden' : 'block'}`}>
              Settings
            </span>
          </Link>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
