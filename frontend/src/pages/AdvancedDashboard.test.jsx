import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import AdvancedDashboard from './AdvancedDashboard';
import * as equipmentService from '../services/equipmentService';
import * as savedSearchService from '../services/savedSearchService';

// Mock the services
jest.mock('../services/equipmentService');
jest.mock('../services/savedSearchService');
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => ({
    user: { id: 1, username: 'admin', role: 'admin' },
    canEditEquipment: () => true,
  }),
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}));
window.IntersectionObserver = mockIntersectionObserver;

describe('AdvancedDashboard Component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock the equipment service
    equipmentService.getEquipment.mockResolvedValue({
      equipment: [
        {
          id: 1,
          type: 'speaker',
          brand: 'Sony',
          model: 'XB-33',
          serial_number: 'SN12345',
          status: 'available',
          location: 'Main Stage',
          description: 'Bluetooth speaker',
          files: [],
        },
        {
          id: 2,
          type: 'camera',
          brand: 'Canon',
          model: 'EOS R5',
          serial_number: 'CN67890',
          status: 'in-use',
          location: 'Studio',
          description: 'Professional camera',
          files: [],
        },
      ],
      page: 1,
      totalPages: 1,
      total: 2,
    });

    // Mock the saved search service
    savedSearchService.getSavedSearches.mockResolvedValue({
      searches: [
        {
          id: 1,
          name: 'Available Speakers',
          filters: JSON.stringify({ type: 'speaker', status: 'available' }),
          sortBy: 'updated_at',
          sortOrder: 'desc',
        },
      ],
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AdvancedDashboard />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  test('renders the search bar', async () => {
    renderComponent();
    
    // Check if search bar is rendered
    const searchInput = screen.getByPlaceholderText(/search equipment/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('shows filter panel when filter button is clicked', async () => {
    renderComponent();
    
    // Click the filter button
    const filterButton = screen.getByText(/show filters/i);
    fireEvent.click(filterButton);
    
    // Check if filter panel is visible
    await waitFor(() => {
      expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
    });
  });

  test('displays equipment cards when data is loaded', async () => {
    renderComponent();
    
    // Wait for equipment cards to be rendered
    await waitFor(() => {
      expect(screen.getByText(/sony xb-33/i)).toBeInTheDocument();
      expect(screen.getByText(/canon eos r5/i)).toBeInTheDocument();
    });
  });

  test('filters equipment when search term is entered', async () => {
    renderComponent();
    
    // Enter search term
    const searchInput = screen.getByPlaceholderText(/search equipment/i);
    fireEvent.change(searchInput, { target: { value: 'Sony' } });
    
    // Mock the filtered response
    equipmentService.getEquipment.mockResolvedValueOnce({
      equipment: [
        {
          id: 1,
          type: 'speaker',
          brand: 'Sony',
          model: 'XB-33',
          serial_number: 'SN12345',
          status: 'available',
          location: 'Main Stage',
          description: 'Bluetooth speaker',
          files: [],
        },
      ],
      page: 1,
      totalPages: 1,
      total: 1,
    });
    
    // Wait for filtered results
    await waitFor(() => {
      expect(equipmentService.getEquipment).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Sony' })
      );
    });
  });
});
