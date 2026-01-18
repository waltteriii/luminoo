import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UIDensity = 'comfortable' | 'compact';

interface DensityContextType {
  density: UIDensity;
  setDensity: (density: UIDensity) => void;
  isCompact: boolean;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<UIDensity>('comfortable');

  useEffect(() => {
    // Load from localStorage first for immediate application
    const stored = localStorage.getItem('ui-density') as UIDensity;
    if (stored && (stored === 'comfortable' || stored === 'compact')) {
      setDensityState(stored);
      document.documentElement.setAttribute('data-density', stored);
    }
  }, []);

  const setDensity = (newDensity: UIDensity) => {
    setDensityState(newDensity);
    localStorage.setItem('ui-density', newDensity);
    document.documentElement.setAttribute('data-density', newDensity);
  };

  return (
    <DensityContext.Provider value={{ 
      density, 
      setDensity,
      isCompact: density === 'compact'
    }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}
