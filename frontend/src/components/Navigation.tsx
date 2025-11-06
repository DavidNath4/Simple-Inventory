import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    const baseClass =
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200';
    const activeClass = 'bg-primary-100 text-primary-700 shadow-sm';
    const inactiveClass = 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';

    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
  };

  const mobileNavLinkClass = (path: string) => {
    const baseClass =
      'block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200';
    const activeClass = 'bg-primary-100 text-primary-700 shadow-sm';
    const inactiveClass = 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';

    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className='bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          {/* Logo and Desktop Navigation */}
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <Link to='/dashboard' className='flex items-center space-x-2'>
                <div className='h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center'>
                  <svg
                    className='h-5 w-5 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                    />
                  </svg>
                </div>
                <h1 className='text-xl font-bold text-gray-900 hidden sm:block'>
                  Inventory Management
                </h1>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className='hidden md:ml-8 md:flex md:space-x-1'>
              <Link to='/dashboard' className={navLinkClass('/dashboard')}>
                <svg
                  className='w-4 h-4 mr-2 inline-block'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z'
                  />
                </svg>
                Dashboard
              </Link>
              <Link to='/inventory' className={navLinkClass('/inventory')}>
                <svg
                  className='w-4 h-4 mr-2 inline-block'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                  />
                </svg>
                Inventory
              </Link>
              {isAdmin && (
                <Link to='/admin' className={navLinkClass('/admin')}>
                  <svg
                    className='w-4 h-4 mr-2 inline-block'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                  </svg>
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className='hidden md:flex md:items-center md:space-x-4'>
            <div className='flex items-center space-x-3'>
              <div className='flex items-center space-x-2'>
                <div className='h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center'>
                  <span className='text-sm font-medium text-gray-600'>
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className='hidden lg:block'>
                  <p className='text-sm font-medium text-gray-900'>
                    {user?.name}
                  </p>
                  <p className='text-xs text-gray-500'>{user?.email}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isAdmin
                    ? 'bg-error-100 text-error-800'
                    : 'bg-primary-100 text-primary-800'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className='btn-secondary text-sm flex items-center'
            >
              <svg
                className='w-4 h-4 mr-2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                />
              </svg>
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center'>
            <button
              onClick={toggleMobileMenu}
              className='inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500'
              aria-expanded='false'
            >
              <span className='sr-only'>Open main menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className='block h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              ) : (
                <svg
                  className='block h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className='md:hidden border-t border-gray-200 bg-white'>
          <div className='px-2 pt-2 pb-3 space-y-1'>
            <Link
              to='/dashboard'
              className={mobileNavLinkClass('/dashboard')}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <svg
                className='w-5 h-5 mr-3 inline-block'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z'
                />
              </svg>
              Dashboard
            </Link>
            <Link
              to='/inventory'
              className={mobileNavLinkClass('/inventory')}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <svg
                className='w-5 h-5 mr-3 inline-block'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                />
              </svg>
              Inventory
            </Link>
            {isAdmin && (
              <Link
                to='/admin'
                className={mobileNavLinkClass('/admin')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  className='w-5 h-5 mr-3 inline-block'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                </svg>
                Admin Panel
              </Link>
            )}
          </div>

          {/* Mobile User Info and Logout */}
          <div className='pt-4 pb-3 border-t border-gray-200'>
            <div className='flex items-center px-5'>
              <div className='h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center'>
                <span className='text-sm font-medium text-gray-600'>
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className='ml-3'>
                <div className='text-base font-medium text-gray-800'>
                  {user?.name}
                </div>
                <div className='text-sm text-gray-500'>{user?.email}</div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    isAdmin
                      ? 'bg-error-100 text-error-800'
                      : 'bg-primary-100 text-primary-800'
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
            <div className='mt-3 px-2'>
              <button
                onClick={handleLogout}
                className='block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
              >
                <svg
                  className='w-5 h-5 mr-3 inline-block'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                  />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
