import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import EquipmentList from '../EquipmentList';
import { AuthProvider } from '../../context/AuthContext';

// Mock axios
jest.mock('axios');

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: () => ({
    user: { id: 1, username: 'testuser', role: 'admin' },
    isAdmin: () => true,
    isAdvanced: () => false,
    isBasic: () => false
  })
}));

// Create a wrapper component with all required providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('EquipmentList Component', () => {
  beforeEach(() => {
    // Mock successful API response
    axios.get.mockResolvedValue({
      data: {
        equipment: [
          {
            id: 1,
            type: 'speaker',
            brand: 'JBL',
            model: 'EON615',
            serial_number: 'JBL123456',
            status: 'available',
            location: 'Main Stage'
          },
          {
            id: 2,
            type: 'microphone',
            brand: 'Shure',
            model: 'SM58',
            serial_number: 'SHURE789012',
            status: 'in-use',
            location: 'Recording Studio'
          }
        ],
        totalCount: 2,
        hasMore: false
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the equipment list', async () => {
    render(<EquipmentList />, { wrapper: createWrapper() });

    // Check if loading state is shown
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('JBL')).toBeInTheDocument();
      expect(screen.getByText('Shure')).toBeInTheDocument();
    });

    // Check if table headers are rendered
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Serial Number')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check if equipment data is rendered
    expect(screen.getByText('JBL')).toBeInTheDocument();
    expect(screen.getByText('EON615')).toBeInTheDocument();
    expect(screen.getByText('JBL123456')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
    expect(screen.getByText('Main Stage')).toBeInTheDocument();

    expect(screen.getByText('Shure')).toBeInTheDocument();
    expect(screen.getByText('SM58')).toBeInTheDocument();
    expect(screen.getByText('SHURE789012')).toBeInTheDocument();
    expect(screen.getByText('in-use')).toBeInTheDocument();
    expect(screen.getByText('Recording Studio')).toBeInTheDocument();

    // Check if action links are rendered
    expect(screen.getAllByText('View').length).toBe(2);
    expect(screen.getAllByText('Edit').length).toBe(2);
  });

  it('filters equipment by type', async () => {
    render(<EquipmentList />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('JBL')).toBeInTheDocument();
    });

    // Mock filtered API response
    axios.get.mockResolvedValueOnce({
      data: {
        equipment: [
          {
            id: 1,
            type: 'speaker',
            brand: 'JBL',
            model: 'EON615',
            serial_number: 'JBL123456',
            status: 'available',
            location: 'Main Stage'
          }
        ],
        totalCount: 1,
        hasMore: false
      }
    });

    // Select speaker type from dropdown
    fireEvent.change(screen.getByLabelText('Filter by equipment type'), { target: { value: 'speaker' } });

    // Wait for filtered data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('type=speaker'));
      expect(screen.getByText('JBL')).toBeInTheDocument();
      expect(screen.queryByText('Shure')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API request fails', async () => {
    // Mock failed API response
    axios.get.mockRejectedValueOnce(new Error('Failed to fetch equipment'));

    render(<EquipmentList />, { wrapper: createWrapper() });

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch equipment')).toBeInTheDocument();
    });
  });
});
