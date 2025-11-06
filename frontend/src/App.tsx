import React from 'react';

function App() {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h1 className='heading-primary text-primary-600'>
            Inventory Management System
          </h1>
          <p className='mt-4 text-muted'>
            Tailwind CSS has been successfully configured! 🎉
          </p>
          <div className='mt-8 space-y-4'>
            <button className='btn-primary w-full'>Primary Button</button>
            <button className='btn-secondary w-full'>Secondary Button</button>
            <div className='card'>
              <div className='card-header'>
                <h3 className='text-lg font-medium'>Sample Card</h3>
              </div>
              <div className='card-body'>
                <p className='text-muted'>
                  This card demonstrates our custom Tailwind components.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
