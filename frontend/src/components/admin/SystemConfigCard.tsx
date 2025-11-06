import React from 'react';

interface ConfigOption {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'input';
  value: any;
  options?: { value: string; label: string }[];
  onChange: (value: any) => void;
  disabled?: boolean;
}

interface SystemConfigCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  options: ConfigOption[];
}

const SystemConfigCard: React.FC<SystemConfigCardProps> = ({
  title,
  description,
  icon,
  options,
}) => {
  const renderConfigOption = (option: ConfigOption) => {
    switch (option.type) {
      case 'toggle':
        return (
          <button
            onClick={() => option.onChange(!option.value)}
            disabled={option.disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              option.value ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                option.value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        );
      case 'select':
        return (
          <select
            value={option.value}
            onChange={(e) => option.onChange(e.target.value)}
            disabled={option.disabled}
            className='form-input text-sm w-24 disabled:opacity-50'
          >
            {option.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'input':
        return (
          <input
            type='text'
            value={option.value}
            onChange={(e) => option.onChange(e.target.value)}
            disabled={option.disabled}
            className='form-input text-sm w-32 disabled:opacity-50'
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 hover:shadow-medium transition-shadow duration-200'>
      <div className='flex items-center mb-4'>
        {icon && (
          <div className='flex-shrink-0 mr-3'>
            <div className='h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center'>
              {icon}
            </div>
          </div>
        )}
        <div>
          <h3 className='text-lg font-medium text-gray-900'>{title}</h3>
          {description && (
            <p className='text-sm text-gray-500 mt-1'>{description}</p>
          )}
        </div>
      </div>
      <div className='space-y-4'>
        {options.map((option) => (
          <div key={option.id} className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-900'>
                {option.label}
              </p>
              <p className='text-sm text-gray-500'>{option.description}</p>
            </div>
            <div className='ml-4'>{renderConfigOption(option)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemConfigCard;
