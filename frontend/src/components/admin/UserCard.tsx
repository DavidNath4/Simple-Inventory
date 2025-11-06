import React from 'react';
import { User, UserRole } from '../../types';

interface UserCardProps {
  user: User;
  onToggleStatus: (user: User) => void;
  onDelete: (userId: string) => void;
  onEdit?: (user: User) => void;
  loading?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onToggleStatus,
  onDelete,
  onEdit,
  loading = false,
}) => {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 hover:shadow-medium transition-shadow duration-200'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center space-x-4'>
          <div className='h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center'>
            <span className='text-lg font-medium text-gray-600'>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className='text-lg font-medium text-gray-900'>{user.name}</h3>
            <p className='text-sm text-gray-500'>{user.email}</p>
            <div className='flex items-center space-x-2 mt-2'>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === UserRole.ADMIN
                    ? 'bg-error-100 text-error-800'
                    : 'bg-primary-100 text-primary-800'
                }`}
              >
                {user.role}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive
                    ? 'bg-success-100 text-success-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <span
                  className={`status-dot mr-1.5 ${
                    user.isActive ? 'online' : 'offline'
                  }`}
                ></span>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          {onEdit && (
            <button
              onClick={() => onEdit(user)}
              disabled={loading}
              className='text-sm px-3 py-1 rounded-md font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 transition-colors disabled:opacity-50'
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onToggleStatus(user)}
            disabled={loading}
            className={`text-sm px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
              user.isActive
                ? 'text-warning-700 bg-warning-100 hover:bg-warning-200'
                : 'text-success-700 bg-success-100 hover:bg-success-200'
            }`}
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(user.id)}
            disabled={loading}
            className='text-sm px-3 py-1 rounded-md font-medium text-error-700 bg-error-100 hover:bg-error-200 transition-colors disabled:opacity-50'
          >
            Delete
          </button>
        </div>
      </div>
      <div className='mt-4 pt-4 border-t border-gray-200'>
        <div className='flex items-center justify-between text-sm text-gray-500'>
          <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(user.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
