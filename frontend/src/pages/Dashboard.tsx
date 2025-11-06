import React, { useState, useEffect, useCallback } from 'react';
import { DashboardMetrics } from '../types';
import { apiService } from '../services/api';
import { useInventoryNotifications, useRealTimeUpdates } from '../hooks';
import { AlertList, RealTimeStatus } from '../components';
import RealTimeTestPanel from '../components/RealTimeTestPanel';
import {
  MetricsCard,
  SimpleChart,
  ReportGenerator,
  AlertsPanel,
  TopItemsPanel,
} from '../components/dashboard';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notifySystem, isRealTimeConnected, checkAlertsManually } = useInventoryNotifications();
  
  // Set up real-time updates with refresh callback
  const { isConnected } = useRealTimeUpdates({
    enableInventoryUpdates: true,
    enableAlerts: true,
    onInventoryUpdate: () => {
      // Refresh dashboard metrics when inventory updates
      loadDashboardMetrics();
    }
  });

  const loadDashboardMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = (await apiService.getDashboardMetrics()) as {
        data: DashboardMetrics;
      };
      setMetrics(response.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load dashboard metrics';
      setError(errorMessage);
      notifySystem('error', 'Dashboard Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [notifySystem]);

  const handleManualRefresh = useCallback(() => {
    loadDashboardMetrics();
    checkAlertsManually();
    notifySystem('info', 'Dashboard Refreshed', 'Data has been updated');
  }, [loadDashboardMetrics, checkAlertsManually, notifySystem]);

  useEffect(() => {
    loadDashboardMetrics();
  }, [loadDashboardMetrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
          <div className='px-4 py-6 sm:px-0'>
            <div className='flex items-center justify-center h-64'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600'></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
          <div className='px-4 py-6 sm:px-0'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
              <h3 className='text-lg font-medium text-red-800 mb-2'>
                Error Loading Dashboard
              </h3>
              <p className='text-red-600'>{error}</p>
              <button
                onClick={loadDashboardMetrics}
                className='mt-4 btn-primary'
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
          <div className='px-4 py-6 sm:px-0'>
            <div className='text-center py-12'>
              <p className='text-gray-500'>No dashboard data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const stockMovementData = metrics.trends.stockMovements
    .slice(-7)
    .map((trend) => ({
      label: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      value: trend.stockIn,
      secondaryValue: trend.stockOut,
    }));

  const valueChangeData = metrics.trends.valueChanges
    .slice(-7)
    .map((trend) => ({
      label: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      value: trend.totalValue,
    }));

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          {/* Header */}
          <div className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Dashboard</h1>
              <p className='mt-2 text-gray-600'>
                Overview of your inventory performance and key metrics
              </p>
            </div>
            <div className='mt-4 sm:mt-0 flex items-center space-x-4'>
              <RealTimeStatus />
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className='btn-secondary flex items-center space-x-2'
                title='Refresh dashboard data'
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Overview Metrics */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
            <MetricsCard
              title='Total Items'
              value={formatNumber(metrics.overview.totalItems)}
              subtitle={`${metrics.overview.totalCategories} categories`}
              icon={
                <svg
                  className='w-6 h-6 text-primary-600'
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

            <MetricsCard
              title='Total Value'
              value={formatCurrency(metrics.overview.totalValue)}
              subtitle={`${metrics.overview.totalLocations} locations`}
              icon={
                <svg
                  className='w-6 h-6 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                  />
                </svg>
              }
            />

            <MetricsCard
              title='Low Stock Items'
              value={formatNumber(metrics.overview.lowStockCount)}
              subtitle='Need attention'
              icon={
                <svg
                  className='w-6 h-6 text-yellow-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              }
            />

            <MetricsCard
              title='Out of Stock'
              value={formatNumber(metrics.overview.outOfStockCount)}
              subtitle='Critical items'
              icon={
                <svg
                  className='w-6 h-6 text-red-600'
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
              }
            />
          </div>

          {/* Charts and Alerts Row */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            <SimpleChart
              title='Stock Movements (Last 7 Days)'
              data={stockMovementData}
              type='line'
              primaryColor='#3B82F6'
              secondaryColor='#EF4444'
              showSecondary={true}
            />

            <AlertsPanel alerts={metrics.alerts} />
          </div>

          {/* Enhanced Alert System */}
          <div className='mb-8'>
            <AlertList
              className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'
              maxVisible={3}
              showFilters={false}
            />
          </div>

          {/* Value Trends Chart */}
          <div className='mb-8'>
            <SimpleChart
              title='Inventory Value Trends (Last 7 Days)'
              data={valueChangeData}
              type='line'
              primaryColor='#10B981'
            />
          </div>

          {/* Top Items Panels */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8'>
            <TopItemsPanel
              type='items'
              topMovingItems={metrics.performance.topMovingItems}
            />

            <TopItemsPanel
              type='categories'
              topCategories={[]} // This would come from metrics if available
            />

            <TopItemsPanel
              type='locations'
              topLocations={[]} // This would come from metrics if available
            />
          </div>

          {/* Performance Metrics */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <MetricsCard
              title='Stock Turnover'
              value={metrics.performance.stockTurnover.toFixed(2)}
              subtitle='Times per period'
              icon={
                <svg
                  className='w-6 h-6 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
              }
            />

            <MetricsCard
              title='Average Stock Level'
              value={formatNumber(
                Math.round(metrics.performance.averageStockLevel)
              )}
              subtitle='Units per item'
              icon={
                <svg
                  className='w-6 h-6 text-purple-600'
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

            <MetricsCard
              title='Stock Accuracy'
              value={`${(metrics.performance.stockAccuracy * 100).toFixed(1)}%`}
              subtitle='System accuracy'
              icon={
                <svg
                  className='w-6 h-6 text-green-600'
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
          </div>

          {/* Report Generator */}
          <ReportGenerator onReportGenerated={loadDashboardMetrics} />

          {/* Real-Time Testing Panel (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8">
              <RealTimeTestPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
