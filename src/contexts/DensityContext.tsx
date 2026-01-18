import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UIDensity = 'comfortable' | 'compact';
export type ViewType = 'year' | 'month' | 'week' | 'day';

interface TooltipSettings {
  year: boolean;
  month: boolean;
  week: boolean;
  day: boolean;
}

interface DensityContextType {
  density: UIDensity;
  setDensity: (density: UIDensity) => void;
  isCompact: boolean;
  tooltipSettings: TooltipSettings;
  setTooltipSettings: (settings: TooltipSettings) => void;
  isTooltipEnabledForView: (view: ViewType) => boolean;
}

const defaultTooltipSettings: TooltipSettings = {
  year: true,
  month: true,
  week: false,
  day: true,
};

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<UIDensity>('comfortable');
  const [tooltipSettings, setTooltipSettingsState] = useState<TooltipSettings>(defaultTooltipSettings);

  useEffect(() => {
    // Load density from localStorage
    const storedDensity = localStorage.getItem('ui-density') as UIDensity;
    if (storedDensity && (storedDensity === 'comfortable' || storedDensity === 'compact')) {
      setDensityState(storedDensity);
      document.documentElement.setAttribute('data-density', storedDensity);
    }
    
    // Load tooltip settings from localStorage
    const storedTooltips = localStorage.getItem('tooltip-settings');
    if (storedTooltips) {
      try {
        const parsed = JSON.parse(storedTooltips);
        setTooltipSettingsState({ ...defaultTooltipSettings, ...parsed });
      } catch {
        // Use defaults
      }
    }
  }, []);

  const setDensity = (newDensity: UIDensity) => {
    setDensityState(newDensity);
    localStorage.setItem('ui-density', newDensity);
    document.documentElement.setAttribute('data-density', newDensity);
  };

  const setTooltipSettings = (settings: TooltipSettings) => {
    setTooltipSettingsState(settings);
    localStorage.setItem('tooltip-settings', JSON.stringify(settings));
  };

  const isTooltipEnabledForView = (view: ViewType): boolean => {
    return tooltipSettings[view] ?? true;
  };

  return (
    <DensityContext.Provider value={{ 
      density, 
      setDensity,
      isCompact: density === 'compact',
      tooltipSettings,
      setTooltipSettings,
      isTooltipEnabledForView,
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
