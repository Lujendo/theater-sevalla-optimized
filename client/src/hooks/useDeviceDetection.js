import { useState, useEffect } from 'react';

/**
 * Custom hook to detect device type and screen size
 * Returns device information for responsive component selection
 */
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    userAgent: '',
    touchSupport: false,
    orientation: 'portrait'
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Mobile device detection patterns
      const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i
      ];

      // Tablet specific patterns
      const tabletPatterns = [
        /iPad/i,
        /Android(?=.*Tablet)|Android(?=.*Tab)/i,
        /Tablet/i
      ];

      // Check if device matches mobile patterns
      const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
      
      // Check if device matches tablet patterns
      const isTabletUA = tabletPatterns.some(pattern => pattern.test(userAgent));
      
      // Screen size based detection
      const isMobileScreen = screenWidth <= 768; // Mobile breakpoint
      const isTabletScreen = screenWidth > 768 && screenWidth <= 1024; // Tablet breakpoint
      
      // Touch support detection
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Orientation detection
      const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';
      
      // Final device classification
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      if (isTabletUA || (isTabletScreen && touchSupport)) {
        isTablet = true;
      } else if (isMobileUA || (isMobileScreen && touchSupport)) {
        isMobile = true;
      } else {
        isDesktop = true;
      }

      // Special handling for iPad (often reports as desktop)
      if (/iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        isMobile = false;
        isTablet = true;
        isDesktop = false;
      }

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        screenHeight,
        userAgent,
        touchSupport,
        orientation
      });
    };

    // Initial detection
    detectDevice();

    // Listen for resize events (orientation changes, etc.)
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
};

/**
 * Simple mobile detection hook for basic use cases
 */
export const useIsMobile = () => {
  const { isMobile } = useDeviceDetection();
  return isMobile;
};

/**
 * Hook to get responsive breakpoint information
 */
export const useBreakpoint = () => {
  const { screenWidth } = useDeviceDetection();
  
  return {
    isXs: screenWidth < 480,      // Extra small phones
    isSm: screenWidth >= 480 && screenWidth < 768,   // Small phones
    isMd: screenWidth >= 768 && screenWidth < 1024,  // Tablets
    isLg: screenWidth >= 1024 && screenWidth < 1280, // Small desktops
    isXl: screenWidth >= 1280,    // Large desktops
    screenWidth
  };
};

export default useDeviceDetection;
