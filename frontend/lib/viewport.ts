/**
 * Mobile viewport height management for virtual keyboard handling
 * Uses visualViewport API with 100vh fallback
 */

export function initializeViewportHeight(): () => void {
  if (typeof window === 'undefined') return () => {};

  const updateViewportHeight = () => {
    // Use visualViewport API for keyboard-aware height
    const vh = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
  };

  // Initial set
  updateViewportHeight();

  // Update on resize (keyboard show/hide)
  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener('resize', updateViewportHeight);
    viewport.addEventListener('scroll', updateViewportHeight);
  } else {
    // Fallback for older browsers
    window.addEventListener('resize', updateViewportHeight);
  }

  // Return cleanup function
  return () => {
    if (viewport) {
      viewport.removeEventListener('resize', updateViewportHeight);
      viewport.removeEventListener('scroll', updateViewportHeight);
    } else {
      window.removeEventListener('resize', updateViewportHeight);
    }
  };
}
