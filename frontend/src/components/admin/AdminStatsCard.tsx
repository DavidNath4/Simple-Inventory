import React from 'react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'blue';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
}) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    error: 'bg-error-100 text-error-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  const trendColorClasses = {
    up: 'text-success-600',
    down: 'text-error-600',
  };

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 hover:shadow-medium transition-shadow duration-200'>
      <div className='flex items-center'>
        <div className='flex-shrink-0'>
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
          >
            {icon}
          </div>
        </div>
        <div className='ml-4 flex-1'>
          <p className='text-sm font-medium text-gray-500'>{title}</p>
          <div className='flex items-baseline'>
            <p className='text-2xl font-semibold text-gray-900'>{value}</p>
            {trend && (
              <div
                className={`ml-2 flex items-center text-sm font-medium ${trendColorClasses[trend.direction]}`}
              >
                <svg
                  className={`h-4 w-4 mr-1 ${trend.direction === 'up' ? 'rotate-0' : 'rotate-180'}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M7 17l9.2-9.2M17 17V7H7'
                  />
                </svg>
                <span>{trend.value}%</span>
                <span className='ml-1 text-gray-500'>{trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsCard;
