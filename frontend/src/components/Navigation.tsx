import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    const baseClass =
      'px-3 py-2 rounded-md text-sm font-medium transition-colors';
    const activeClass = 'bg-primary-100 text-primary-700';
    const inactiveClass = 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';

    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
  };

  return (
    <nav className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <h1 className='text-xl font-bold text-primary-600'>
                Inventory Management
              </h1>
            </div>
            <div className='hidden md:ml-6 md:flex md:space-x-8'>
              <Link to='/dashboard' className={navLinkClass('/dashboard')}>
                Dashboard
              </Link>
              <Link to='/inventory' className={navLinkClass('/inventory')}>
                Inventory
              </Link>
              {isAdmin && (
                <Link to='/admin' className={navLinkClass('/admin')}>
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-gray-600'>Welcome,</span>
              <span className='text-sm font-medium text-gray-900'>
                {user?.name}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  isAdmin
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button onClick={handleLogout} className='btn-secondary text-sm'>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className='md:hidden'>
        <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200'>
          <Link
            to='/dashboard'
            className={`block ${navLinkClass('/dashboard')}`}
          >
            Dashboard
          </Link>
          <Link
            to='/inventory'
            className={`block ${navLinkClass('/inventory')}`}
          >
            Inventory
          </Link>
          {isAdmin && (
            <Link to='/admin' className={`block ${navLinkClass('/admin')}`}>
              Admin Panel
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
