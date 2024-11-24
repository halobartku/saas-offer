import { useState, useEffect } from "react";

export function useMobile(breakpoint: number = 768) {
  // Initialize with null to indicate not yet determined
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      // Check if window is defined (for SSR)
      if (typeof window === 'undefined') {
        console.warn('Window object not available - SSR environment detected');
        return;
      }

      const checkMobile = () => {
        try {
          setIsMobile(window.innerWidth < breakpoint);
        } catch (error) {
          console.error('Error checking mobile state:', error);
          // Default to desktop view in case of error
          setIsMobile(false);
        }
      };

      // Initial check
      checkMobile();

      // Add event listener
      window.addEventListener('resize', checkMobile);

      // Cleanup
      return () => {
        try {
          window.removeEventListener('resize', checkMobile);
        } catch (error) {
          console.error('Error removing resize listener:', error);
        }
      };
    } catch (error) {
      console.error('Error in useMobile hook:', error);
      // Default to desktop view in case of error
      setIsMobile(false);
    }
  }, [breakpoint]);

  // Return false (desktop view) if not yet determined
  return isMobile ?? false;
}
