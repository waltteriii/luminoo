import { useEffect, useRef, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // minimum distance for swipe
  enabled?: boolean;
}

/**
 * Hook for detecting horizontal swipe gestures (touch + trackpad)
 * Used for navigating between days/weeks/months/years
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
}: SwipeOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);
  const accumulatedDeltaX = useRef<number>(0);
  const isScrolling = useRef<boolean | null>(null);

  const handleSwipe = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const deltaX = touchStartX.current - touchEndX.current;
    const absX = Math.abs(deltaX);
    
    if (absX > threshold) {
      if (deltaX > 0) {
        // Swiped left -> go forward (next day/week/month)
        onSwipeLeft?.();
      } else {
        // Swiped right -> go back (previous day/week/month)
        onSwipeRight?.();
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    isScrolling.current = null;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartX.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    // Determine scroll direction on first move
    if (isScrolling.current === null) {
      const deltaX = Math.abs(currentX - touchStartX.current);
      const deltaY = Math.abs(currentY - (e.touches[0].clientY || 0));
      // If vertical movement is greater, it's a scroll
      isScrolling.current = deltaY > deltaX;
    }
    
    // Only track horizontal if not scrolling
    if (!isScrolling.current) {
      touchEndX.current = currentX;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (!isScrolling.current) {
      handleSwipe();
    }
    touchStartX.current = null;
    touchEndX.current = null;
    isScrolling.current = null;
  }, [enabled, handleSwipe]);

  // Trackpad horizontal scroll (wheel event with deltaX)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;
    
    // Only handle horizontal scroll (trackpad swipe)
    // Ignore if shift is pressed (manual horizontal scroll)
    if (e.shiftKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    
    const now = Date.now();
    
    // Reset accumulator if too much time passed
    if (now - lastWheelTime.current > 200) {
      accumulatedDeltaX.current = 0;
    }
    
    accumulatedDeltaX.current += e.deltaX;
    lastWheelTime.current = now;
    
    // Trigger swipe when threshold is reached
    if (Math.abs(accumulatedDeltaX.current) > threshold * 2) {
      if (accumulatedDeltaX.current > 0) {
        onSwipeLeft?.(); // Scroll right = go forward
      } else {
        onSwipeRight?.(); // Scroll left = go back
      }
      accumulatedDeltaX.current = 0;
    }
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  const bindToElement = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled) return () => {};
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('wheel', handleWheel, { passive: true });
    
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
