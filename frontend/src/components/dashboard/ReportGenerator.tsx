import React, { useState } from 'react';
import { ExportFormat, ReportFilter } from '../../types';
import { apiService } from '../../services/api';
import LoadingButton from '../LoadingButton';
import FormInput from '../FormInput';

interface ReportGeneratorProps {
  onReportGenerated?: () => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  onReportGenerated,
}) => {
  const [filter, setFilter] = useState<ReportFilter>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilterChange = (field: keyof ReportFilter, value: string) => {
    setFilter((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      await apiService.getInventoryReport(filter);

      if (onReportGenerated) {
        onReportGenerated();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate report'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format: ExportFormat) => {
    try {
      setIsExporting(format);
      setError(null);

      const blob = await apiService.exportInventoryReport(format, filter);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setIsExporting(null);
    }
  };

  const clearFilters = () => {
    setFilter({});
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
      <h3 className='text-lg font-semibold text-gray-900 mb-4'>
        Generate Reports
      </h3>

      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <FormInput
          label='Start Date'
          type='date'
          value={filter.startDate || ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
        />

        <FormInput
          label='End Date'
          type='date'
          value={filter.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
        />

        <FormInput
          label='Category'
          type='text'
          placeholder='Filter by category'
          value={filter.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        />

        <FormInput
          label='Location'
          type='text'
          placeholder='Filter by location'
          value={filter.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
        />
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <LoadingButton
          onClick={handleGenerateReport}
          loading={isGenerating}
          className='btn-primary'
        >
          Generate Report
        </LoadingButton>

        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600'>Export as:</span>

          <LoadingButton
            onClick={() => handleExportReport('csv')}
            loading={isExporting === 'csv'}
            variant='secondary'
            size='sm'
          >
            CSV
          </LoadingButton>

          <LoadingButton
            onClick={() => handleExportReport('json')}
            loading={isExporting === 'json'}
            variant='secondary'
            size='sm'
          >
            JSON
          </LoadingButton>

          <LoadingButton
            onClick={() => handleExportReport('pdf')}
            loading={isExporting === 'pdf'}
            variant='secondary'
            size='sm'
          >
            PDF
          </LoadingButton>
        </div>

        <button
          onClick={clearFilters}
          className='text-sm text-gray-500 hover:text-gray-700 underline'
        >
          Clear Filters
        </button>
      </div>

      {Object.keys(filter).some((key) => filter[key as keyof ReportFilter]) && (
        <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md'>
          <p className='text-sm text-blue-700'>
            <strong>Active Filters:</strong>{' '}
            {Object.entries(filter)
              .filter(([, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
