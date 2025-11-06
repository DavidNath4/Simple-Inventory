import React from 'react';

const Login: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h1 className='heading-primary text-primary-600 mb-8'>
            Inventory Management System
          </h1>
          <div className='card'>
            <div className='card-header'>
              <h2 className='text-xl font-semibold'>Sign In</h2>
            </div>
            <div className='card-body'>
              <p className='text-muted mb-4'>
                Login form will be implemented in the next task
              </p>
              <button className='btn-primary w-full'>
                Login (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
