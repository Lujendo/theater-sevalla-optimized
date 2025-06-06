import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { getEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { useAuth } from './AuthContext';

// Create the notification context
const NotificationContext = createContext();

// Define the threshold for low stock alerts (can be made configurable later)
const LOW_STOCK_THRESHOLD = 3;

/**
 * Provider component for notifications
 * Manages notifications across the application
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Fetch equipment data for stock level checks
  const { data: equipmentData } = useQuery(
    ['equipment', { limit: 1000 }], // Fetch a large batch to analyze stock levels
    () => getEquipment({ limit: 1000 }),
    {
      enabled: isAdmin, // Only fetch if user is admin
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
    }
  );

  // Fetch equipment types
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
    enabled: isAdmin,
  });

  // Check for low stock levels
  useEffect(() => {
    if (!isAdmin || !equipmentData?.equipment || !typesData?.types) return;

    const equipment = equipmentData.equipment;
    const types = typesData.types;

    // Group equipment by type
    const equipmentByType = {};
    equipment.forEach(item => {
      if (item.type) {
        if (!equipmentByType[item.type]) {
          equipmentByType[item.type] = [];
        }
        equipmentByType[item.type].push(item);
      }
    });

    // Check each type for low available stock
    const lowStockAlerts = [];
    Object.entries(equipmentByType).forEach(([typeName, items]) => {
      const availableItems = items.filter(item => item.status === 'available');
      if (availableItems.length <= LOW_STOCK_THRESHOLD) {
        const typeInfo = types.find(t => t.name.toLowerCase() === typeName.toLowerCase());
        lowStockAlerts.push({
          id: `low-stock-${typeName}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `Only ${availableItems.length} ${typeName} ${availableItems.length === 1 ? 'item is' : 'items are'} available.`,
          timestamp: new Date(),
          read: false,
          typeId: typeInfo?.id,
        });
      }
    });

    // Update notifications state with low stock alerts
    if (lowStockAlerts.length > 0) {
      setNotifications(prev => {
        // Filter out existing low stock alerts to avoid duplicates
        const filteredNotifications = prev.filter(
          notification => !notification.id.startsWith('low-stock-')
        );
        return [...filteredNotifications, ...lowStockAlerts];
      });
    }
  }, [equipmentData, typesData, isAdmin]);

  // Add a new notification
  const addNotification = (notification) => {
    setNotifications(prev => [
      ...prev,
      {
        id: notification.id || `notification-${Date.now()}`,
        timestamp: new Date(),
        read: false,
        ...notification,
      },
    ]);
  };

  // Mark a notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Remove a notification
  const removeNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Get unread notifications count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Context value
  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
