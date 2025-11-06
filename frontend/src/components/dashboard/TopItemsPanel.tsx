import React from 'react';

interface TopItem {
  id: string;
  name: string;
  sku: string;
  totalMovements: number;
  netMovement: number;
}

interface TopCategory {
  category: string;
  itemCount: number;
  totalValue: number;
}

interface TopLocation {
  location: string;
  itemCount: number;
  totalValue: number;
}

interface TopItemsPanelProps {
  topMovingItems?: TopItem[];
  topCategories?: TopCategory[];
  topLocations?: TopLocation[];
  type: 'items' | 'categories' | 'locations';
  className?: string;
}

const TopItemsPanel: React.FC<TopItemsPanelProps> = ({
  topMovingItems = [],
  topCategories = [],
  topLocations = [],
  type,
  className = '',
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getTitle = () => {
    switch (type) {
      case 'items':
        return 'Top Moving Items';
      case 'categories':
        return 'Top Categories';
      case 'locations':
        return 'Top Locations';
      default:
        return 'Top Items';
    }
  };

  const renderItems = () => {
    if (type === 'items') {
      return topMovingItems.slice(0, 5).map((item, index) => (
        <div key={item.id} className='flex items-center justify-between py-3'>
          <div className='flex items-center space-x-3'>
            <div className='flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
              <span className='text-sm font-medium text-primary-600'>
                {index + 1}
              </span>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900'>{item.name}</p>
              <p className='text-xs text-gray-500'>SKU: {item.sku}</p>
            </div>
          </div>
          <div className='text-right'>
            <p className='text-sm font-medium text-gray-900'>
              {item.totalMovements} moves
            </p>
            <p
              className={`text-xs ${
                item.netMovement >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              Net: {item.netMovement >= 0 ? '+' : ''}
              {item.netMovement}
            </p>
          </div>
        </div>
      ));
    }

    if (type === 'categories') {
      return topCategories.slice(0, 5).map((category, index) => (
        <div
          key={category.category}
          className='flex items-center justify-between py-3'
        >
          <div className='flex items-center space-x-3'>
            <div className='flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
              <span className='text-sm font-medium text-green-600'>
                {index + 1}
              </span>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900'>
                {category.category}
              </p>
              <p className='text-xs text-gray-500'>
                {category.itemCount} items
              </p>
            </div>
          </div>
          <div className='text-right'>
            <p className='text-sm font-medium text-gray-900'>
              {formatCurrency(category.totalValue)}
            </p>
          </div>
        </div>
      ));
    }

    if (type === 'locations') {
      return topLocations.slice(0, 5).map((location, index) => (
        <div
          key={location.location}
          className='flex items-center justify-between py-3'
        >
          <div className='flex items-center space-x-3'>
            <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
              <span className='text-sm font-medium text-blue-600'>
                {index + 1}
              </span>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900'>
                {location.location}
              </p>
              <p className='text-xs text-gray-500'>
                {location.itemCount} items
              </p>
            </div>
          </div>
          <div className='text-right'>
            <p className='text-sm font-medium text-gray-900'>
              {formatCurrency(location.totalValue)}
            </p>
          </div>
        </div>
      ));
    }

    return null;
  };

  const isEmpty = () => {
    switch (type) {
      case 'items':
        return topMovingItems.length === 0;
      case 'categories':
        return topCategories.length === 0;
      case 'locations':
        return topLocations.length === 0;
      default:
        return true;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <h3 className='text-lg font-semibold text-gray-900 mb-4'>{getTitle()}</h3>

      {isEmpty() ? (
        <div className='text-center py-8'>
          <div className='text-4xl mb-2'>📊</div>
          <p className='text-gray-500'>No data available</p>
          <p className='text-sm text-gray-400 mt-1'>
            Data will appear here once you have inventory activity
          </p>
        </div>
      ) : (
        <div className='divide-y divide-gray-100'>{renderItems()}</div>
      )}
    </div>
  );
};

export default TopItemsPanel;
