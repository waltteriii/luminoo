import { useEffect, useRef, useState } from 'react';

type Size = { width: number; height: number };

/**
 * ResizeObserver-based element sizing.
 * - SSR-safe (does nothing until mounted in browser)
 * - Returns a stable ref plus the latest width/height
 */
export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) => {
        // Avoid state churn
        const nextWidth = Math.round(width);
        const nextHeight = Math.round(height);
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

