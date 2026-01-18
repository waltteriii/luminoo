import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  TimeRangeSettings, 
  TimeRangeMode, 
  OffHoursDisplay, 
  defaultTimeRangeSettings 
} from '@/lib/timeRangeConfig';

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
  // Time range settings
  timeRangeSettings: TimeRangeSettings;
  setTimeRangeSettings: (settings: TimeRangeSettings) => void;
  updateTimeRangeSetting: <K extends keyof TimeRangeSettings>(key: K, value: TimeRangeSettings[K]) => void;
}

const defaultTooltipSettings: TooltipSettings = {
  year: true,
  month: true,
  week: false,
  day: true,
};

const DensityContext = createContext<DensityContextType | undefined>(undefined);

const TIME_RANGE_STORAGE_KEY = 'time-range-settings';

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<UIDensity>('comfortable');
  const [tooltipSettings, setTooltipSettingsState] = useState<TooltipSettings>(defaultTooltipSettings);
  const [timeRangeSettings, setTimeRangeSettingsState] = useState<TimeRangeSettings>(defaultTimeRangeSettings);

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

    // Load time range settings from localStorage
    const storedTimeRange = localStorage.getItem(TIME_RANGE_STORAGE_KEY);
    if (storedTimeRange) {
      try {
        const parsed = JSON.parse(storedTimeRange);
        setTimeRangeSettingsState({ ...defaultTimeRangeSettings, ...parsed });
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

  const setTimeRangeSettings = (settings: TimeRangeSettings) => {
    setTimeRangeSettingsState(settings);
    localStorage.setItem(TIME_RANGE_STORAGE_KEY, JSON.stringify(settings));
  };

  const updateTimeRangeSetting = <K extends keyof TimeRangeSettings>(key: K, value: TimeRangeSettings[K]) => {
    setTimeRangeSettingsState(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(TIME_RANGE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <DensityContext.Provider value={{ 
      density, 
      setDensity,
      isCompact: density === 'compact',
      tooltipSettings,
      setTooltipSettings,
      isTooltipEnabledForView,
      timeRangeSettings,
      setTimeRangeSettings,
      updateTimeRangeSetting,
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
