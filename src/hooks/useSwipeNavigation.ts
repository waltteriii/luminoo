import { useRef, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Optimized hook for horizontal swipe gestures (touch + trackpad).
 * Uses passive listeners and debouncing for smooth 60fps performance.
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
}: SwipeOptions) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);
  const accumulatedDeltaX = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isHorizontalSwipe.current = null;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Determine swipe direction on first significant move
    if (isHorizontalSwipe.current === null) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX.current);
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      
      // Need at least 10px movement to determine direction
      if (deltaX > 10 || deltaY > 10) {
        isHorizontalSwipe.current = deltaX > deltaY * 1.5; // Bias toward horizontal
      }
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isHorizontalSwipe.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touchStartX.current - touch.clientX;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
    
    isHorizontalSwipe.current = null;
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled || e.shiftKey) return;
    
    // Only handle horizontal trackpad gestures
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absY > absX) return;
    
    const now = Date.now();
    if (now - lastWheelTime.current > 150) {
      accumulatedDeltaX.current = 0;
    }
    
    accumulatedDeltaX.current += e.deltaX;
    lastWheelTime.current = now;
    
    const swipeThreshold = threshold * 1.5;
    if (Math.abs(accumulatedDeltaX.current) > swipeThreshold) {
      if (accumulatedDeltaX.current > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      accumulatedDeltaX.current = 0;
    }
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  const bindToElement = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled) return () => {};
    
    // Use passive listeners for better scroll performance
    const options = { passive: true } as const;
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('wheel', handleWheel, options);
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  return { bindToElement };
}

export default useSwipeNavigation;
