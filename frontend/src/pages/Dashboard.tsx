import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center'>
            <div className='text-center'>
              <h1 className='heading-primary text-primary-600 mb-4'>
                Dashboard
              </h1>
              <p className='text-muted'>
                Inventory metrics and analytics will be displayed here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
