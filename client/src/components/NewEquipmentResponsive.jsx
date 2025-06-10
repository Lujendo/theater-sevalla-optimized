import React, { Suspense } from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// Lazy load components for better performance
const NewEquipmentModern = React.lazy(() => import('./NewEquipmentModern'));
const NewEquipmentMobile = React.lazy(() => import('./NewEquipmentMobile'));

/**
 * Responsive wrapper component that automatically selects the appropriate
 * Add New Equipment component based on device type and screen size
 */
const NewEquipmentResponsive = () => {
  const { isMobile, isTablet, screenWidth, touchSupport } = useDeviceDetection();

  // Loading component for Suspense
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading equipment form...</p>
      </div>
    </div>
  );

  // Device detection logging for debugging
  React.useEffect(() => {
    console.log('📱 Device Detection:', {
      isMobile,
      isTablet,
      screenWidth,
      touchSupport,
      userAgent: navigator.userAgent,
      selectedComponent: isMobile ? 'Mobile' : 'Desktop'
    });
  }, [isMobile, isTablet, screenWidth, touchSupport]);

  // Component selection logic
  const shouldUseMobileComponent = () => {
    // Primary criteria: Mobile device detection
    if (isMobile) return true;
    
    // Secondary criteria: Small screen with touch support (mobile-like experience)
    if (screenWidth <= 768 && touchSupport) return true;
    
    // Tertiary criteria: Very small screen regardless of device type
    if (screenWidth <= 480) return true;
    
    return false;
  };

  const useMobileComponent = shouldUseMobileComponent();

  return (
    <div className="min-h-screen">
      {/* Device indicator for development (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 z-50 bg-black text-white text-xs p-2 rounded-bl">
          📱 {useMobileComponent ? 'Mobile' : 'Desktop'} | {screenWidth}px
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        {useMobileComponent ? (
          <NewEquipmentMobile />
        ) : (
          <NewEquipmentModern />
        )}
      </Suspense>
    </div>
  );
};

export default NewEquipmentResponsive;
