import React from 'react';

const Admin: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center'>
            <div className='text-center'>
              <h1 className='heading-primary text-primary-600 mb-4'>
                Admin Panel
              </h1>
              <p className='text-muted'>
                User management and system configuration will be displayed here
              </p>
              <p className='text-sm text-red-600 mt-2'>Admin access only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
