import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './Icons';
import NotificationBell from './NotificationBell';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout, isImpersonating } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white text-slate-800 shadow-soft sticky top-0 z-30 border-b border-slate-200 h-16">
      <div className="container-app py-0">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo and title */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <img src="/bird-logo.svg" alt="Theater Equipment Logo" className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-800">Equipment Inventory</span>
            </Link>
          </div>

          {/* User info and logout */}
          {user ? (
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                {user.role === 'admin' && (
                  <NotificationBell />
                )}
                <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm flex items-center">
                  <span className="font-medium">{user.username}</span>
                  <span className="ml-1 text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                    {user.role}
                  </span>
                  {isImpersonating() && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full border border-yellow-200">
                      Impersonating
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="nav-link text-slate-600 hover:text-red-600"
                  aria-label="Logout"
                >
                  <LogoutIcon />
                  <span className="hidden md:inline">{isImpersonating() ? 'End Impersonation' : 'Logout'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <Link
                to="/login"
                className="btn btn-primary"
              >
                <LogoutIcon className="rotate-180" />
                <span>Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
