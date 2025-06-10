import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/barcode.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ImpersonationBanner from './components/ImpersonationBanner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdvancedDashboard from './pages/AdvancedDashboard';
import UserSettings from './pages/UserSettings';
import UserSettingsModern from './pages/UserSettingsModern';
import EquipmentList from './components/EquipmentList';
import EquipmentDetails from './components/EquipmentDetails';
import EquipmentDetailsModern from './components/EquipmentDetailsModern';
import EditEquipment from './components/EditEquipment';
import EditEquipmentModern from './components/EditEquipmentModern';
import NewEquipment from './components/NewEquipment';
import NewEquipmentModern from './components/NewEquipmentModern';
import NewEquipmentResponsive from './components/NewEquipmentResponsive';
import AdminDashboard from './components/AdminDashboard';
import EquipmentLogsPage from './pages/EquipmentLogsPage';
import ShowList from './pages/ShowList';
import ShowDetails from './pages/ShowDetails';
import ManageEquipment from './pages/ManageEquipment';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};



// Admin route component
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Layout component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <ImpersonationBanner />
      <Navbar />
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={setSidebarOpen}
        toggleCollapse={setSidebarCollapsed}
      />
      <main className={`main-content pt-16 ${sidebarOpen ? (sidebarCollapsed ? 'main-content-with-sidebar-collapsed' : 'main-content-with-sidebar') : ''}`}>
        <div className="container-app">
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

// Wide Layout component for pages that need more space
const WideLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <ImpersonationBanner />
      <Navbar />
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={setSidebarOpen}
        toggleCollapse={setSidebarCollapsed}
      />
      <main className={`main-content pt-16 ${sidebarOpen ? (sidebarCollapsed ? 'main-content-with-sidebar-collapsed' : 'main-content-with-sidebar') : ''}`}>
        <div className="container-app-wide">
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App component
const AppContent = () => {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WideLayout>
                <AdvancedDashboard />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <WideLayout>
                <AdvancedDashboard />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/simple-dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />



        <Route
          path="/equipment/new"
          element={
            <ProtectedRoute>
              <NewEquipmentResponsive />
            </ProtectedRoute>
          }
        />

        <Route
          path="/equipment/:id/edit"
          element={
            <ProtectedRoute>
              <WideLayout>
                <EditEquipmentModern />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/equipment/:id"
          element={
            <ProtectedRoute>
              <WideLayout>
                <EquipmentDetailsModern />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/equipment"
          element={
            <ProtectedRoute>
              <WideLayout>
                <EquipmentList />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/show-list"
          element={
            <ProtectedRoute>
              <WideLayout>
                <ShowList />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/show/:showId"
          element={
            <ProtectedRoute>
              <WideLayout>
                <ShowDetails />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/show/:showId/manage-equipment"
          element={
            <ProtectedRoute>
              <WideLayout>
                <ManageEquipment />
              </WideLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </AdminRoute>
          }
        />

        <Route
          path="/equipment-logs"
          element={
            <AdminRoute>
              <WideLayout>
                <EquipmentLogsPage />
              </WideLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <UserSettingsModern />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

// Wrap everything with providers
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
