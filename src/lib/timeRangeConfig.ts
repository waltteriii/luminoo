/**
 * Time Range Configuration for Day/Week views
 * Provides utilities for unified day/night timeline display
 */

export type TimeRangeMode = 'FOCUS' | 'FULL_24H';

// Simplified display modes: what hours to show on the timeline
export type TimeDisplayMode = 'DAY' | 'NIGHT' | 'BOTH';

// Legacy types for backward compatibility
export type DayViewLayout = 'BOTH' | 'DAY_ONLY' | 'NIGHT_ONLY';
export type OffHoursDisplay = 'COLLAPSED' | 'DENSE_EXPANDED';

// Per-day override for focus hours
export interface DayTimeOverride {
  focusStartTime: number;
  focusEndTime: number;
}

export interface TimeRangeSettings {
  dayTimeRangeMode: TimeRangeMode;
  weekTimeRangeMode: TimeRangeMode;
  focusStartTime: number; // Hour (0-23), e.g., 8 for 08:00
  focusEndTime: number; // Hour (0-24), e.g., 23 for 23:00
  dayViewLayout: DayViewLayout; // Legacy - maps to TimeDisplayMode
  timeDisplayMode: TimeDisplayMode; // New unified display mode
  offHoursDisplay: OffHoursDisplay; // Legacy
  offHoursDenseScaleFactor: number; // Legacy
  perDayOverrides: Record<string, DayTimeOverride>; // Key is date string (YYYY-MM-DD)
}

export const defaultTimeRangeSettings: TimeRangeSettings = {
  dayTimeRangeMode: 'FOCUS',
  weekTimeRangeMode: 'FOCUS',
  focusStartTime: 8, // 08:00
  focusEndTime: 23, // 23:00
  dayViewLayout: 'BOTH', // Legacy
  timeDisplayMode: 'BOTH', // New: show day + night combined
  offHoursDisplay: 'COLLAPSED', // Legacy
  offHoursDenseScaleFactor: 0.35, // Legacy
  perDayOverrides: {},
};

/**
 * Get effective focus times for a specific date (considering per-day overrides)
 */
export function getEffectiveFocusTimes(
  settings: TimeRangeSettings,
  dateStr: string
): { focusStartTime: number; focusEndTime: number } {
  const override = settings.perDayOverrides[dateStr];
  if (override) {
    return { focusStartTime: override.focusStartTime, focusEndTime: override.focusEndTime };
  }
  return { focusStartTime: settings.focusStartTime, focusEndTime: settings.focusEndTime };
}

/**
 * Time options for selectors (30-minute increments)
 */
export function getTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    options.push({ value: h, label: formatHourLabel(h) });
    options.push({ value: h + 0.5, label: formatHalfHourLabel(h) });
  }
  options.push({ value: 24, label: '12 AM (midnight end)' });
  return options;
}

/**
 * Format half-hour label (e.g., 8.5 -> "8:30 AM")
 */
function formatHalfHourLabel(hour: number): string {
  const h = Math.floor(hour);
  if (h === 0) return '12:30 AM';
  if (h === 12) return '12:30 PM';
  if (h < 12) return `${h}:30 AM`;
  return `${h - 12}:30 PM`;
}

export interface TimeRangeConfig {
  startHour: number;
  endHour: number;
  hours: number[];
  hourHeight: number;
  totalHeight: number;
  // For night mode that crosses midnight
  isCrossingMidnight: boolean;
  // Night segment info (for NIGHT mode)
  nightSegments?: { startHour: number; endHour: number }[];
}

/**
 * Calculate unified time range based on display mode
 * Handles Day, Night, Both, and Full 24H modes
 */
export function getUnifiedTimeRangeConfig(
  mode: TimeRangeMode,
  displayMode: TimeDisplayMode,
  focusStartTime: number,
  focusEndTime: number,
  baseHourHeight: number
): TimeRangeConfig {
  // Full 24H mode: always show 00:00–24:00
  if (mode === 'FULL_24H') {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return {
      startHour: 0,
      endHour: 24,
      hours,
      hourHeight: baseHourHeight,
      totalHeight: 24 * baseHourHeight,
      isCrossingMidnight: false,
    };
  }

  // Focus mode with display mode
  switch (displayMode) {
    case 'DAY': {
      // Show only focus hours (daytime)
      const dayHourCount = focusEndTime - focusStartTime;
      const hours = Array.from({ length: dayHourCount }, (_, i) => i + focusStartTime);
      return {
        startHour: focusStartTime,
        endHour: focusEndTime,
        hours,
        hourHeight: baseHourHeight,
        totalHeight: dayHourCount * baseHourHeight,
        isCrossingMidnight: false,
      };
    }
    
    case 'NIGHT': {
      // Show only night hours (off-hours) as one continuous timeline
      // Night spans from focusEndTime to focusStartTime (crossing midnight)
      // e.g., 23:00 → 24:00 and 00:00 → 08:00 = 9 hours total
      const nightBeforeHours = focusStartTime; // 00:00 to focusStart
      const nightAfterHours = 24 - focusEndTime; // focusEnd to 24:00
      const totalNightHours = nightBeforeHours + nightAfterHours;
      
      // Generate hours: focusEnd to 24, then 0 to focusStart
      const hours: number[] = [];
      for (let h = focusEndTime; h < 24; h++) hours.push(h);
      for (let h = 0; h < focusStartTime; h++) hours.push(h);
      
      return {
        startHour: focusEndTime, // Logical start
        endHour: focusStartTime + 24, // Logical end (crossing midnight)
        hours,
        hourHeight: baseHourHeight,
        totalHeight: totalNightHours * baseHourHeight,
        isCrossingMidnight: true,
        nightSegments: [
          { startHour: focusEndTime, endHour: 24 },
          { startHour: 0, endHour: focusStartTime },
        ],
      };
    }
    
    case 'BOTH':
    default: {
      // Show full 24 hours in focus mode (combined day + night)
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return {
        startHour: 0,
        endHour: 24,
        hours,
        hourHeight: baseHourHeight,
        totalHeight: 24 * baseHourHeight,
        isCrossingMidnight: false,
      };
    }
  }
}

/**
 * Legacy function - maintained for backward compatibility
 * Use getUnifiedTimeRangeConfig for new code
 */
export function getTimeRangeConfig(
  mode: TimeRangeMode,
  settings: TimeRangeSettings,
  baseHourHeight: number
): TimeRangeConfig & { hasNightBefore: boolean; hasNightAfter: boolean; nightBeforeHours: number; nightAfterHours: number } {
  // Convert legacy dayViewLayout to timeDisplayMode
  const displayMode = layoutToDisplayMode(settings.dayViewLayout);
  const config = getUnifiedTimeRangeConfig(
    mode,
    settings.timeDisplayMode || displayMode,
    settings.focusStartTime,
    settings.focusEndTime,
    baseHourHeight
  );
  
  return {
    ...config,
    hasNightBefore: settings.focusStartTime > 0,
    hasNightAfter: settings.focusEndTime < 24,
    nightBeforeHours: settings.focusStartTime,
    nightAfterHours: 24 - settings.focusEndTime,
  };
}

/**
 * Convert legacy DayViewLayout to TimeDisplayMode
 */
export function layoutToDisplayMode(layout: DayViewLayout): TimeDisplayMode {
  switch (layout) {
    case 'DAY_ONLY': return 'DAY';
    case 'NIGHT_ONLY': return 'NIGHT';
    case 'BOTH':
    default: return 'BOTH';
  }
}

/**
 * Convert TimeDisplayMode to legacy DayViewLayout
 */
export function displayModeToLayout(mode: TimeDisplayMode): DayViewLayout {
  switch (mode) {
    case 'DAY': return 'DAY_ONLY';
    case 'NIGHT': return 'NIGHT_ONLY';
    case 'BOTH':
    default: return 'BOTH';
  }
}

/**
 * Calculate the vertical position of a task within the unified timeline
 * Returns null if the task is entirely outside the visible range
 */
export function getTaskPositionInUnifiedRange(
  taskStartHours: number,
  taskEndHours: number,
  config: TimeRangeConfig
): { top: number; height: number; isPartialTop: boolean; isPartialBottom: boolean } | null {
  if (config.isCrossingMidnight && config.nightSegments) {
    // Night mode: handle midnight crossing
    const segment1 = config.nightSegments[0]; // focusEnd to 24
    const segment2 = config.nightSegments[1]; // 0 to focusStart
    const segment1Hours = segment1.endHour - segment1.startHour;
    
    // Check if task is in segment 1 (evening)
    if (taskStartHours >= segment1.startHour && taskStartHours < segment1.endHour) {
      const clampedStart = Math.max(taskStartHours, segment1.startHour);
      const clampedEnd = Math.min(taskEndHours, segment1.endHour);
      const top = (clampedStart - segment1.startHour) * config.hourHeight;
      const height = (clampedEnd - clampedStart) * config.hourHeight;
      return {
        top,
        height,
        isPartialTop: false,
        isPartialBottom: taskEndHours > segment1.endHour,
      };
    }
    
    // Check if task is in segment 2 (early morning)
    if (taskStartHours >= segment2.startHour && taskStartHours < segment2.endHour) {
      const clampedStart = Math.max(taskStartHours, segment2.startHour);
      const clampedEnd = Math.min(taskEndHours, segment2.endHour);
      const top = segment1Hours * config.hourHeight + (clampedStart - segment2.startHour) * config.hourHeight;
      const height = (clampedEnd - clampedStart) * config.hourHeight;
      return {
        top,
        height,
        isPartialTop: false,
        isPartialBottom: taskEndHours > segment2.endHour,
      };
    }
    
    return null; // Task is in daytime, not visible in night mode
  }
  
  // Standard mode (Day, Both, or Full 24H)
  if (taskEndHours <= config.startHour || taskStartHours >= config.endHour) {
    return null; // Entirely outside visible range
  }
  
  const clampedStart = Math.max(taskStartHours, config.startHour);
  const clampedEnd = Math.min(taskEndHours, config.endHour);
  const top = (clampedStart - config.startHour) * config.hourHeight;
  const height = (clampedEnd - clampedStart) * config.hourHeight;
  
  return {
    top,
    height,
    isPartialTop: taskStartHours < config.startHour,
    isPartialBottom: taskEndHours > config.endHour,
  };
}

// Legacy alias
export const getTaskPositionInRange = getTaskPositionInUnifiedRange;

/**
 * Check if a time (in hours) is in daytime (focus hours)
 */
export function isInDaytime(
  timeHours: number,
  focusStartTime: number,
  focusEndTime: number
): boolean {
  return timeHours >= focusStartTime && timeHours < focusEndTime;
}

/**
 * Check if a time (in hours) is in nighttime (off-hours)
 */
export function isInNighttime(
  timeHours: number,
  focusStartTime: number,
  focusEndTime: number
): boolean {
  return timeHours < focusStartTime || timeHours >= focusEndTime;
}

/**
 * Legacy function for backward compatibility
 */
export function isInOffHours(
  timeHours: number,
  settings: TimeRangeSettings
): 'night-before' | 'night-after' | null {
  if (timeHours < settings.focusStartTime) return 'night-before';
  if (timeHours >= settings.focusEndTime) return 'night-after';
  return null;
}

/**
 * Legacy function for backward compatibility
 */
export function getTasksInOffHours<T extends { start_time?: string | null; end_time?: string | null }>(
  tasks: T[],
  offHoursType: 'night-before' | 'night-after',
  settings: TimeRangeSettings,
  parseTimeToHours: (time: string | null | undefined) => number | null
): T[] {
  return tasks.filter(task => {
    const startHour = parseTimeToHours(task.start_time);
    if (startHour === null) return false;

    if (offHoursType === 'night-before') {
      return startHour < settings.focusStartTime;
    } else {
      return startHour >= settings.focusEndTime;
    }
  });
}

/**
 * Convert a click/drag Y position to an hour value
 */
export function yPositionToHour(
  y: number,
  config: TimeRangeConfig
): number {
  if (config.isCrossingMidnight && config.nightSegments) {
    // Night mode with midnight crossing
    const segment1 = config.nightSegments[0];
    const segment1Hours = segment1.endHour - segment1.startHour;
    const segment1Height = segment1Hours * config.hourHeight;
    
    if (y < segment1Height) {
      // In segment 1 (evening)
      return segment1.startHour + Math.floor(y / config.hourHeight);
    } else {
      // In segment 2 (early morning)
      const segment2 = config.nightSegments[1];
      const yInSegment2 = y - segment1Height;
      return segment2.startHour + Math.floor(yInSegment2 / config.hourHeight);
    }
  }
  
  const hour = Math.floor(y / config.hourHeight) + config.startHour;
  return Math.max(config.startHour, Math.min(config.endHour - 1, hour));
}

/**
 * Format hour for display (e.g., 0 -> "12 AM", 13 -> "1 PM")
 */
export function formatHourLabel(hour: number): string {
  const normalizedHour = hour % 24;
  if (normalizedHour === 0) return '12 AM';
  if (normalizedHour === 12) return '12 PM';
  if (normalizedHour < 12) return `${normalizedHour} AM`;
  return `${normalizedHour - 12} PM`;
}
