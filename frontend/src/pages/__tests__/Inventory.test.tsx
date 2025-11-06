import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import Inventory from '../Inventory';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { apiService } from '../../services/api';
import { InventoryItem, User, UserRole, ActionType } from '../../types';

// Mock API service
jest.mock('../../services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useInventoryNotifications: () => ({
    notifyInventoryUpdate: jest.fn(),
    notifyBulkOperation: jest.fn(),
    notifySystem: jest.fn(),
  }),
}));

// Mock AuthContext
const mockAuthContext = {
  user: null as User | null,
  token: 'mock-token',
  isAuthenticated: true,
  isAdmin: false,
  login: jest.fn(),
  logout: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock NotificationContext
jest.mock('../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNotification: () => ({
    addNotification: jest.fn(),
  }),
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Widget A',
    sku: 'WID-001',
    category: 'Electronics',
    stockLevel: 25,
    minStock: 10,
    maxStock: 100,
    unitPrice: 15.99,
    location: 'Warehouse A',
    description: 'High-quality widget',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Widget B',
    sku: 'WID-002',
    category: 'Electronics',
    stockLevel: 5,
    minStock: 10,
    maxStock: 50,
    unitPrice: 25.99,
    location: 'Warehouse B',
    description: 'Premium widget',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Gadget C',
    sku: 'GAD-001',
    category: 'Tools',
    stockLevel: 0,
    minStock: 5,
    maxStock: 25,
    unitPrice: 45.99,
    location: 'Warehouse A',
    description: 'Useful gadget',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
];

const mockPaginatedResponse = {
  data: mockInventoryItems,
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

const renderInventory = () => {
  return render(
    <AuthProvider>
      <NotificationProvider>
        <Inventory />
      </NotificationProvider>
    </AuthProvider>
  );
};

describe('Inventory Page', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.USER,
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.user = mockUser;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.isAdmin = false;

    // Default API responses
    mockApiService.get.mockImplementation((url) => {
      if (url.includes('/inventory?')) {
        return Promise.resolve(mockPaginatedResponse);
      }
      if (url.includes('/inventory/categories')) {
        return Promise.resolve({ data: ['Electronics', 'Tools'] });
      }
      if (url.includes('/inventory/locations')) {
        return Promise.resolve({ data: ['Warehouse A', 'Warehouse B'] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  describe('Page Rendering', () => {
    it('renders inventory page header and description', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
        expect(screen.getByText('Manage your inventory items, track stock levels, and perform bulk operations')).toBeInTheDocument();
      });
    });

    it('renders Add Item button', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
      });
    });

    it('renders filter controls', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name, SKU, or description...')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('Low Stock Only')).toBeInTheDocument();
      });
    });
  });

  describe('Inventory Table', () => {
    it('displays inventory items in table format', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Widget A')).toBeInTheDocument();
        expect(screen.getByText('WID-001')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Warehouse A')).toBeInTheDocument();
        expect(screen.getByText('$15.99')).toBeInTheDocument();
      });
    });

    it('displays stock status badges correctly', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('In Stock')).toBeInTheDocument(); // Widget A
        expect(screen.getByText('Low Stock')).toBeInTheDocument(); // Widget B
        expect(screen.getByText('Out of Stock')).toBeInTheDocument(); // Gadget C
      });
    });

    it('shows correct stock status styling', async () => {
      renderInventory();

      await waitFor(() => {
        const inStockBadge = screen.getByText('In Stock');
        expect(inStockBadge).toHaveClass('text-green-600', 'bg-green-50');

        const lowStockBadge = screen.getByText('Low Stock');
        expect(lowStockBadge).toHaveClass('text-yellow-600', 'bg-yellow-50');

        const outOfStockBadge = screen.getByText('Out of Stock');
        expect(outOfStockBadge).toHaveClass('text-red-600', 'bg-red-50');
      });
    });

    it('displays calculated total values correctly', async () => {
      renderInventory();

      await waitFor(() => {
        // Widget A: 25 * $15.99 = $399.75
        expect(screen.getByText('Total: $399.75')).toBeInTheDocument();
        // Widget B: 5 * $25.99 = $129.95
        expect(screen.getByText('Total: $129.95')).toBeInTheDocument();
        // Gadget C: 0 * $45.99 = $0.00
        expect(screen.getByText('Total: $0.00')).toBeInTheDocument();
      });
    });

    it('shows Edit and Delete buttons for each item', async () => {
      renderInventory();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        const deleteButtons = screen.getAllByText('Delete');

        expect(editButtons).toHaveLength(3);
        expect(deleteButtons).toHaveLength(3);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('updates search filter when user types', async () => {
      renderInventory();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by name, SKU, or description...');
        fireEvent.change(searchInput, { target: { value: 'Widget' } });

        expect(searchInput).toHaveValue('Widget');
      });
    });

    it('updates category filter when user selects option', async () => {
      renderInventory();

      await waitFor(() => {
        const categorySelect = screen.getByDisplayValue('All Categories');
        fireEvent.change(categorySelect, { target: { value: 'Electronics' } });

        expect(categorySelect).toHaveValue('Electronics');
      });
    });

    it('updates location filter when user selects option', async () => {
      renderInventory();

      await waitFor(() => {
        const locationSelect = screen.getByDisplayValue('All Locations');
        fireEvent.change(locationSelect, { target: { value: 'Warehouse A' } });

        expect(locationSelect).toHaveValue('Warehouse A');
      });
    });

    it('toggles low stock filter when checkbox is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const lowStockCheckbox = screen.getByRole('checkbox', { name: 'Low Stock Only' });
        fireEvent.click(lowStockCheckbox);

        expect(lowStockCheckbox).toBeChecked();
      });
    });
  });

  describe('Item Selection', () => {
    it('allows individual item selection', async () => {
      renderInventory();

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        const itemCheckbox = checkboxes[1]; // First item checkbox (index 0 is select all)

        fireEvent.click(itemCheckbox);
        expect(itemCheckbox).toBeChecked();
      });
    });

    it('shows bulk update button when items are selected', async () => {
      renderInventory();

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        const itemCheckbox = checkboxes[1];

        fireEvent.click(itemCheckbox);

        expect(screen.getByText('Bulk Update (1)')).toBeInTheDocument();
      });
    });

    it('selects all items when select all checkbox is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(selectAllCheckbox);

        expect(selectAllCheckbox).toBeChecked();
        expect(screen.getByText('Bulk Update (3)')).toBeInTheDocument();
      });
    });
  });

  describe('Add Item Modal', () => {
    it('opens add item modal when Add Item button is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: 'Add Item' });
        fireEvent.click(addButton);

        expect(screen.getByText('Add New Inventory Item')).toBeInTheDocument();
      });
    });

    it('renders all form fields in add modal', async () => {
      renderInventory();

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: 'Add Item' });
        fireEvent.click(addButton);

        expect(screen.getByLabelText('Name *')).toBeInTheDocument();
        expect(screen.getByLabelText('SKU *')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Category *')).toBeInTheDocument();
        expect(screen.getByLabelText('Location *')).toBeInTheDocument();
        expect(screen.getByLabelText('Stock Level')).toBeInTheDocument();
        expect(screen.getByLabelText('Min Stock *')).toBeInTheDocument();
        expect(screen.getByLabelText('Max Stock')).toBeInTheDocument();
        expect(screen.getByLabelText('Unit Price *')).toBeInTheDocument();
      });
    });

    it('closes modal when Cancel button is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: 'Add Item' });
        fireEvent.click(addButton);

        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);

        expect(screen.queryByText('Add New Inventory Item')).not.toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      mockApiService.post.mockResolvedValueOnce({
        data: { ...mockInventoryItems[0], id: '4', name: 'New Widget' },
      });

      renderInventory();

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: 'Add Item' });
        fireEvent.click(addButton);

        fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'New Widget' } });
        fireEvent.change(screen.getByLabelText('SKU *'), { target: { value: 'NEW-001' } });
        fireEvent.change(screen.getByLabelText('Category *'), { target: { value: 'Electronics' } });
        fireEvent.change(screen.getByLabelText('Location *'), { target: { value: 'Warehouse A' } });
        fireEvent.change(screen.getByLabelText('Min Stock *'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Unit Price *'), { target: { value: '19.99' } });

        const submitButton = screen.getByRole('button', { name: 'Add Item' });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/inventory', expect.objectContaining({
          name: 'New Widget',
          sku: 'NEW-001',
          category: 'Electronics',
          location: 'Warehouse A',
          minStock: 5,
          unitPrice: 19.99,
        }));
      });
    });
  });

  describe('Edit Item Modal', () => {
    it('opens edit modal when Edit button is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Edit Inventory Item')).toBeInTheDocument();
      });
    });

    it('pre-fills form with existing item data', async () => {
      renderInventory();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        expect(screen.getByDisplayValue('Widget A')).toBeInTheDocument();
        expect(screen.getByDisplayValue('WID-001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Warehouse A')).toBeInTheDocument();
      });
    });

    it('disables SKU field when editing', async () => {
      renderInventory();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        const skuField = screen.getByDisplayValue('WID-001');
        expect(skuField).toBeDisabled();
      });
    });
  });

  describe('Stock Adjustment', () => {
    it('allows quick stock adjustment from table', async () => {
      mockApiService.post.mockResolvedValueOnce({
        data: { ...mockInventoryItems[0], stockLevel: 30 },
      });

      renderInventory();

      await waitFor(() => {
        const stockInputs = screen.getAllByDisplayValue('25');
        const stockInput = stockInputs[0];

        fireEvent.change(stockInput, { target: { value: '30' } });
        fireEvent.blur(stockInput);
      });

      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/inventory/1/adjust', {
          stockLevel: 30,
          notes: 'Quick adjustment from inventory page',
        });
      });
    });
  });

  describe('Delete Item', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockApiService.delete.mockResolvedValueOnce({});

      renderInventory();

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this item?');

      await waitFor(() => {
        expect(mockApiService.delete).toHaveBeenCalledWith('/inventory/1');
      });

      confirmSpy.mockRestore();
    });

    it('does not delete when user cancels confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderInventory();

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockApiService.delete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Bulk Operations', () => {
    it('opens bulk update modal when bulk update button is clicked', async () => {
      renderInventory();

      await waitFor(() => {
        const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(selectAllCheckbox);

        const bulkButton = screen.getByText('Bulk Update (3)');
        fireEvent.click(bulkButton);

        expect(screen.getByText('Bulk Update (3 items)')).toBeInTheDocument();
      });
    });

    it('shows selected items in bulk modal', async () => {
      renderInventory();

      await waitFor(() => {
        const itemCheckbox = screen.getAllByRole('checkbox')[1];
        fireEvent.click(itemCheckbox);

        const bulkButton = screen.getByText('Bulk Update (1)');
        fireEvent.click(bulkButton);

        expect(screen.getByText('Widget A')).toBeInTheDocument();
        expect(screen.getByText('Current Stock: 25')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading spinner while fetching data', () => {
      mockApiService.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderInventory();

      expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
    });

    it('shows error message when API call fails', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Failed to load inventory'));

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Failed to load inventory')).toBeInTheDocument();
      });
    });

    it('shows empty state when no items exist', async () => {
      mockApiService.get.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('No inventory items found')).toBeInTheDocument();
        expect(screen.getByText('Get started by adding your first inventory item.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add First Item' })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination when there are multiple pages', async () => {
      mockApiService.get.mockResolvedValueOnce({
        data: mockInventoryItems,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      });

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 3 of 50 results')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('allows regular users to access inventory management', async () => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAdmin = false;

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
      });
    });

    it('allows admin users to access inventory management', async () => {
      mockAuthContext.user = { ...mockUser, role: UserRole.ADMIN };
      mockAuthContext.isAdmin = true;

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
      });
    });
  });
});