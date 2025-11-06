import React, { useState, useEffect, useCallback } from 'react';
import { InventoryItem, ActionType } from '../types';
import { apiService } from '../services/api';
import { LoadingButton } from '../components';

interface InventoryFilter {
  search: string;
  category: string;
  location: string;
  lowStock: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BulkUpdateItem {
  id: string;
  name?: string;
  category?: string;
  location?: string;
  minStock?: number;
  maxStock?: number;
  unitPrice?: number;
}

interface StockUpdateItem {
  id: string;
  stockLevel: number;
  type?: ActionType;
  notes?: string;
}

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Filters
  const [filters, setFilters] = useState<InventoryFilter>({
    search: '',
    category: '',
    location: '',
    lowStock: false,
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Selection for bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [bulkUpdates, setBulkUpdates] = useState<BulkUpdateItem[]>([]);
  const [stockUpdates, setStockUpdates] = useState<StockUpdateItem[]>([]);

  // Load inventory items
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.lowStock) queryParams.append('lowStock', 'true');

      const response = await apiService.get<PaginatedResponse<InventoryItem>>(
        `/inventory?${queryParams.toString()}`
      );

      setItems(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Load categories and locations
  const loadFilters = useCallback(async () => {
    try {
      const [categoriesRes, locationsRes] = await Promise.all([
        apiService.get<{ success: boolean; data: string[] }>(
          '/inventory/categories'
        ),
        apiService.get<{ success: boolean; data: string[] }>(
          '/inventory/locations'
        ),
      ]);

      setCategories(categoriesRes.data);
      setLocations(locationsRes.data);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Handle filter changes
  const handleFilterChange = (
    key: keyof InventoryFilter,
    value: string | boolean
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle selection
  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === items.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle form submission for add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingItem) {
        // Update existing item
        await apiService.put(`/inventory/${editingItem.id}`, formData);
      } else {
        // Create new item
        await apiService.post('/inventory', formData);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingItem(null);
      setFormData({});
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setLoading(true);
      await apiService.delete(`/inventory/${itemId}`);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk operations
  const handleBulkUpdate = async () => {
    try {
      setLoading(true);

      if (bulkUpdates.length > 0) {
        await apiService.post('/inventory/bulk/update', {
          updates: bulkUpdates,
        });
      }

      if (stockUpdates.length > 0) {
        await apiService.post('/inventory/bulk/stock', {
          updates: stockUpdates,
        });
      }

      setShowBulkModal(false);
      setBulkUpdates([]);
      setStockUpdates([]);
      setSelectedItems(new Set());
      setSelectAll(false);
      await loadItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to perform bulk update'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle stock adjustment
  const handleStockAdjust = async (itemId: string, newStock: number) => {
    try {
      await apiService.post(`/inventory/${itemId}/adjust`, {
        stockLevel: newStock,
        notes: 'Quick adjustment from inventory page',
      });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    }
  };

  // Get stock status styling
  const getStockStatus = (item: InventoryItem) => {
    if (item.stockLevel === 0) {
      return { text: 'Out of Stock', className: 'text-red-600 bg-red-50' };
    } else if (item.stockLevel <= item.minStock) {
      return { text: 'Low Stock', className: 'text-yellow-600 bg-yellow-50' };
    }
    return { text: 'In Stock', className: 'text-green-600 bg-green-50' };
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex justify-between items-center'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                Inventory Management
              </h1>
              <p className='mt-2 text-gray-600'>
                Manage your inventory items, track stock levels, and perform
                bulk operations
              </p>
            </div>
            <div className='flex space-x-3'>
              {selectedItems.size > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
                >
                  Bulk Update ({selectedItems.size})
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className='bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors'
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Search
              </label>
              <input
                type='text'
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder='Search by name, SKU, or description...'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value=''>All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value=''>All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-end'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={filters.lowStock}
                  onChange={(e) =>
                    handleFilterChange('lowStock', e.target.checked)
                  }
                  className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='ml-2 text-sm text-gray-700'>
                  Low Stock Only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
            <div className='flex'>
              <div className='text-red-600'>
                <svg
                  className='w-5 h-5'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <p className='text-sm text-red-800'>{error}</p>
              </div>
              <div className='ml-auto'>
                <button
                  onClick={() => setError(null)}
                  className='text-red-600 hover:text-red-800'
                >
                  <svg
                    className='w-4 h-4'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'>
          {loading ? (
            <div className='flex justify-center items-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <span className='ml-3 text-gray-600'>Loading inventory...</span>
            </div>
          ) : items.length === 0 ? (
            <div className='text-center py-12'>
              <div className='text-gray-400 mb-4'>
                <svg
                  className='w-12 h-12 mx-auto'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                No inventory items found
              </h3>
              <p className='text-gray-600 mb-4'>
                Get started by adding your first inventory item.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
              >
                Add First Item
              </button>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left'>
                        <input
                          type='checkbox'
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        />
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Item Details
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Category & Location
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Stock Level
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Price
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {items.map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <tr key={item.id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4'>
                            <input
                              type='checkbox'
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                            />
                          </td>
                          <td className='px-6 py-4'>
                            <div>
                              <div className='text-sm font-medium text-gray-900'>
                                {item.name}
                              </div>
                              <div className='text-sm text-gray-500'>
                                SKU: {item.sku}
                              </div>
                              {item.description && (
                                <div className='text-sm text-gray-500 mt-1'>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <div className='text-sm text-gray-900'>
                              {item.category}
                            </div>
                            <div className='text-sm text-gray-500'>
                              {item.location}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <div className='flex items-center space-x-2'>
                              <input
                                type='number'
                                value={item.stockLevel}
                                onChange={(e) => {
                                  const newStock =
                                    parseInt(e.target.value) || 0;
                                  if (newStock !== item.stockLevel) {
                                    handleStockAdjust(item.id, newStock);
                                  }
                                }}
                                className='w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                                min='0'
                              />
                              <div className='text-xs text-gray-500'>
                                Min: {item.minStock}
                                {item.maxStock && ` | Max: ${item.maxStock}`}
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <div className='text-sm text-gray-900'>
                              ${item.unitPrice.toFixed(2)}
                            </div>
                            <div className='text-xs text-gray-500'>
                              Total: $
                              {(item.stockLevel * item.unitPrice).toFixed(2)}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.className}`}
                            >
                              {stockStatus.text}
                            </span>
                          </td>
                          <td className='px-6 py-4 text-right text-sm font-medium space-x-2'>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setFormData(item);
                                setShowEditModal(true);
                              }}
                              className='text-blue-600 hover:text-blue-900'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className='text-red-600 hover:text-red-900'
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className='bg-white px-4 py-3 border-t border-gray-200 sm:px-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 flex justify-between sm:hidden'>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Next
                      </button>
                    </div>
                    <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                      <div>
                        <p className='text-sm text-gray-700'>
                          Showing{' '}
                          <span className='font-medium'>
                            {(currentPage - 1) * itemsPerPage + 1}
                          </span>{' '}
                          to{' '}
                          <span className='font-medium'>
                            {Math.min(currentPage * itemsPerPage, totalItems)}
                          </span>{' '}
                          of <span className='font-medium'>{totalItems}</span>{' '}
                          results
                        </p>
                      </div>
                      <div>
                        <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'>
                          <button
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                            className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            Previous
                          </button>
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              const page = i + Math.max(1, currentPage - 2);
                              if (page > totalPages) return null;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === currentPage
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            }
                          )}
                          <button
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white'>
            <div className='mt-3'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Name *
                    </label>
                    <input
                      type='text'
                      required
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      SKU *
                    </label>
                    <input
                      type='text'
                      required
                      value={formData.sku || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sku: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      disabled={!!editingItem} // SKU cannot be changed when editing
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Category *
                    </label>
                    <input
                      type='text'
                      required
                      value={formData.category || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      list='categories'
                    />
                    <datalist id='categories'>
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Location *
                    </label>
                    <input
                      type='text'
                      required
                      value={formData.location || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      list='locations'
                    />
                    <datalist id='locations'>
                      {locations.map((location) => (
                        <option key={location} value={location} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Stock Level
                    </label>
                    <input
                      type='number'
                      min='0'
                      value={formData.stockLevel || 0}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stockLevel: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Min Stock *
                    </label>
                    <input
                      type='number'
                      min='0'
                      required
                      value={formData.minStock || 0}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          minStock: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Max Stock
                    </label>
                    <input
                      type='number'
                      min='0'
                      value={formData.maxStock || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxStock: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        }))
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Unit Price *
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    required
                    value={formData.unitPrice || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        unitPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  />
                </div>

                <div className='flex justify-end space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingItem(null);
                      setFormData({});
                    }}
                    className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type='submit'
                    loading={loading}
                    className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white'>
            <div className='mt-3'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>
                Bulk Update ({selectedItems.size} items)
              </h3>

              <div className='space-y-6'>
                {/* Bulk Property Updates */}
                <div>
                  <h4 className='text-md font-medium text-gray-800 mb-3'>
                    Update Properties
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Category
                      </label>
                      <input
                        type='text'
                        placeholder='Leave empty to keep current values'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        onChange={(e) => {
                          const updates = Array.from(selectedItems).map(
                            (id) => ({
                              id,
                              category: e.target.value || undefined,
                            })
                          );
                          setBulkUpdates(updates);
                        }}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Location
                      </label>
                      <input
                        type='text'
                        placeholder='Leave empty to keep current values'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        onChange={(e) => {
                          setBulkUpdates((prev) =>
                            prev.map((update) => ({
                              ...update,
                              location: e.target.value || undefined,
                            }))
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bulk Stock Updates */}
                <div>
                  <h4 className='text-md font-medium text-gray-800 mb-3'>
                    Stock Level Updates
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Action Type
                      </label>
                      <select
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        onChange={(e) => {
                          const type = e.target.value as ActionType;
                          setStockUpdates(
                            Array.from(selectedItems).map((id) => ({
                              id,
                              stockLevel: 0,
                              type,
                            }))
                          );
                        }}
                      >
                        <option value=''>Select action...</option>
                        <option value={ActionType.ADD_STOCK}>Add Stock</option>
                        <option value={ActionType.REMOVE_STOCK}>
                          Remove Stock
                        </option>
                        <option value={ActionType.ADJUST_STOCK}>
                          Set Stock Level
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Quantity/Level
                      </label>
                      <input
                        type='number'
                        min='0'
                        placeholder='Enter quantity or new level'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        onChange={(e) => {
                          const stockLevel = parseInt(e.target.value) || 0;
                          setStockUpdates((prev) =>
                            prev.map((update) => ({
                              ...update,
                              stockLevel,
                            }))
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Notes
                      </label>
                      <input
                        type='text'
                        placeholder='Optional notes'
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        onChange={(e) => {
                          const notes = e.target.value;
                          setStockUpdates((prev) =>
                            prev.map((update) => ({
                              ...update,
                              notes: notes || undefined,
                            }))
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Items Preview */}
                <div>
                  <h4 className='text-md font-medium text-gray-800 mb-3'>
                    Selected Items
                  </h4>
                  <div className='max-h-40 overflow-y-auto border border-gray-200 rounded-lg'>
                    <div className='divide-y divide-gray-200'>
                      {items
                        .filter((item) => selectedItems.has(item.id))
                        .map((item) => (
                          <div
                            key={item.id}
                            className='px-4 py-2 flex justify-between items-center'
                          >
                            <div>
                              <span className='font-medium'>{item.name}</span>
                              <span className='text-gray-500 ml-2'>
                                ({item.sku})
                              </span>
                            </div>
                            <div className='text-sm text-gray-600'>
                              Current Stock: {item.stockLevel}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex justify-end space-x-3 pt-6'>
                <button
                  type='button'
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkUpdates([]);
                    setStockUpdates([]);
                  }}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleBulkUpdate}
                  loading={loading}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                  disabled={
                    bulkUpdates.length === 0 && stockUpdates.length === 0
                  }
                >
                  Apply Updates
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
