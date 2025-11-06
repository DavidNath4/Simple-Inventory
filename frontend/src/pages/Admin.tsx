import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import apiService from '../services/api';
import {
  LoadingButton,
  FormInput,
  AdminStatsCard,
  SystemConfigCard,
} from '../components';

interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  inventory: {
    totalItems: number;
  };
  activity: {
    recentActions: number;
  };
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'system'>(
    'dashboard'
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: UserRole.USER,
  });

  useEffect(() => {
    if (isAdmin && activeTab === 'dashboard') {
      loadDashboardStats();
    } else if (isAdmin && activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, isAdmin]);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 text-error-400'>
            <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h1 className='mt-4 text-xl font-semibold text-gray-900'>
            Access Denied
          </h1>
          <p className='mt-2 text-gray-600'>
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{
        success: boolean;
        data: AdminStats;
      }>('/admin/dashboard');
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{ success: boolean; data: User[] }>(
        '/admin/users'
      );
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiService.post('/admin/users', createUserData);
      setShowCreateUser(false);
      setCreateUserData({
        name: '',
        email: '',
        password: '',
        role: UserRole.USER,
      });
      loadUsers();
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      setLoading(true);
      const endpoint = user.isActive ? 'deactivate' : 'activate';
      await apiService.patch(`/admin/users/${user.id}/${endpoint}`, {});
      loadUsers();
    } catch (err) {
      setError(`Failed to ${user.isActive ? 'deactivate' : 'activate'} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await apiService.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const TabButton: React.FC<{
    tab: string;
    label: string;
    icon: React.ReactNode;
  }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
        activeTab === tab
          ? 'bg-primary-100 text-primary-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <span className='mr-2'>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Admin Panel</h1>
          <p className='mt-2 text-gray-600'>
            Manage users and system configuration
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className='mb-6 bg-error-50 border border-error-200 rounded-lg p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-5 w-5 text-error-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <p className='text-sm text-error-800'>{error}</p>
              </div>
              <div className='ml-auto pl-3'>
                <button
                  onClick={() => setError(null)}
                  className='inline-flex text-error-400 hover:text-error-600'
                >
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className='mb-8'>
          <div className='flex space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200'>
            <TabButton
              tab='dashboard'
              label='Dashboard'
              icon={
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              }
            />
            <TabButton
              tab='users'
              label='User Management'
              icon={
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                  />
                </svg>
              }
            />
            <TabButton
              tab='system'
              label='System Configuration'
              icon={
                <svg
                  className='w-4 h-4'
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
              }
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
          {activeTab === 'dashboard' && (
            <div className='p-6'>
              <h2 className='text-xl font-semibold text-gray-900 mb-6'>
                System Overview
              </h2>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                </div>
              ) : stats ? (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                  <AdminStatsCard
                    title='Total Users'
                    value={stats.users.total}
                    color='primary'
                    icon={
                      <svg
                        className='h-5 w-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                        />
                      </svg>
                    }
                  />
                  <AdminStatsCard
                    title='Active Users'
                    value={stats.users.active}
                    color='success'
                    icon={
                      <svg
                        className='h-5 w-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                    }
                  />
                  <AdminStatsCard
                    title='Inventory Items'
                    value={stats.inventory.totalItems}
                    color='warning'
                    icon={
                      <svg
                        className='h-5 w-5'
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
                    }
                  />
                  <AdminStatsCard
                    title='Recent Actions (24h)'
                    value={stats.activity.recentActions}
                    color='blue'
                    icon={
                      <svg
                        className='h-5 w-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 10V3L4 14h7v7l9-11h-7z'
                        />
                      </svg>
                    }
                  />
                </div>
              ) : (
                <p className='text-gray-500'>No data available</p>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className='p-6'>
              <div className='flex justify-between items-center mb-6'>
                <h2 className='text-xl font-semibold text-gray-900'>
                  User Management
                </h2>
                <LoadingButton
                  onClick={() => setShowCreateUser(true)}
                  variant='primary'
                  leftIcon={
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                      />
                    </svg>
                  }
                >
                  Add User
                </LoadingButton>
              </div>

              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          User
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Role
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Created
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {users.map((user) => (
                        <tr key={user.id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <div className='h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center'>
                                <span className='text-sm font-medium text-gray-600'>
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className='ml-4'>
                                <div className='text-sm font-medium text-gray-900'>
                                  {user.name}
                                </div>
                                <div className='text-sm text-gray-500'>
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === UserRole.ADMIN
                                  ? 'bg-error-100 text-error-800'
                                  : 'bg-primary-100 text-primary-800'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.isActive
                                  ? 'bg-success-100 text-success-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <span
                                className={`status-dot mr-1.5 ${user.isActive ? 'online' : 'offline'}`}
                              ></span>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                            <div className='flex items-center justify-end space-x-2'>
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                                  user.isActive
                                    ? 'text-warning-700 bg-warning-100 hover:bg-warning-200'
                                    : 'text-success-700 bg-success-100 hover:bg-success-200'
                                }`}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className='text-xs px-3 py-1 rounded-md font-medium text-error-700 bg-error-100 hover:bg-error-200 transition-colors'
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className='text-center py-12'>
                      <svg
                        className='mx-auto h-12 w-12 text-gray-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                        />
                      </svg>
                      <h3 className='mt-2 text-sm font-medium text-gray-900'>
                        No users found
                      </h3>
                      <p className='mt-1 text-sm text-gray-500'>
                        Get started by creating a new user.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className='p-6'>
              <h2 className='text-xl font-semibold text-gray-900 mb-6'>
                System Configuration
              </h2>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <SystemConfigCard
                  title='Application Settings'
                  description='Configure general application behavior'
                  icon={
                    <svg
                      className='h-5 w-5 text-primary-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                      />
                    </svg>
                  }
                  options={[
                    {
                      id: 'maintenance',
                      label: 'Maintenance Mode',
                      description: 'Temporarily disable user access',
                      type: 'toggle',
                      value: false,
                      onChange: (value) =>
                        console.log('Maintenance mode:', value),
                    },
                    {
                      id: 'registration',
                      label: 'User Registration',
                      description: 'Allow new user registration',
                      type: 'toggle',
                      value: true,
                      onChange: (value) =>
                        console.log('User registration:', value),
                    },
                  ]}
                />
                <SystemConfigCard
                  title='Security Settings'
                  description='Configure security and authentication options'
                  icon={
                    <svg
                      className='h-5 w-5 text-primary-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  }
                  options={[
                    {
                      id: 'twoFactor',
                      label: 'Two-Factor Authentication',
                      description: 'Require 2FA for admin users',
                      type: 'toggle',
                      value: false,
                      onChange: (value) => console.log('2FA:', value),
                    },
                    {
                      id: 'sessionTimeout',
                      label: 'Session Timeout',
                      description: 'Auto-logout after inactivity',
                      type: 'select',
                      value: '60',
                      options: [
                        { value: '30', label: '30m' },
                        { value: '60', label: '1h' },
                        { value: '120', label: '2h' },
                        { value: '240', label: '4h' },
                      ],
                      onChange: (value) =>
                        console.log('Session timeout:', value),
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateUser && (
          <div
            className='modal-overlay'
            onClick={() => setShowCreateUser(false)}
          >
            <div className='modal-content' onClick={(e) => e.stopPropagation()}>
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-medium text-gray-900'>
                    Create New User
                  </h3>
                  <button
                    onClick={() => setShowCreateUser(false)}
                    className='text-gray-400 hover:text-gray-600'
                  >
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleCreateUser} className='space-y-4'>
                  <FormInput
                    label='Full Name'
                    type='text'
                    value={createUserData.name}
                    onChange={(e) =>
                      setCreateUserData({
                        ...createUserData,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                  <FormInput
                    label='Email Address'
                    type='email'
                    value={createUserData.email}
                    onChange={(e) =>
                      setCreateUserData({
                        ...createUserData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                  <FormInput
                    label='Password'
                    type='password'
                    value={createUserData.password}
                    onChange={(e) =>
                      setCreateUserData({
                        ...createUserData,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                  <div>
                    <label className='form-label'>Role</label>
                    <select
                      value={createUserData.role}
                      onChange={(e) =>
                        setCreateUserData({
                          ...createUserData,
                          role: e.target.value as UserRole,
                        })
                      }
                      className='form-input'
                    >
                      <option value={UserRole.USER}>User</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <div className='flex justify-end space-x-3 pt-4'>
                    <button
                      type='button'
                      onClick={() => setShowCreateUser(false)}
                      className='btn-secondary'
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      type='submit'
                      loading={loading}
                      variant='primary'
                    >
                      Create User
                    </LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
