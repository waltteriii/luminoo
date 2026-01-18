/**
 * Time Range Configuration for Day/Week views
 * Provides utilities for 24-hour and focus mode time display
 */

export type TimeRangeMode = 'FOCUS' | 'FULL_24H';
export type OffHoursDisplay = 'COLLAPSED' | 'DENSE_EXPANDED';

export interface TimeRangeSettings {
  dayTimeRangeMode: TimeRangeMode;
  weekTimeRangeMode: TimeRangeMode;
  focusStartTime: number; // Hour (0-23), e.g., 8 for 08:00
  focusEndTime: number; // Hour (0-24), e.g., 23 for 23:00
  offHoursDisplay: OffHoursDisplay;
  offHoursDenseScaleFactor: number; // e.g., 0.35
}

export const defaultTimeRangeSettings: TimeRangeSettings = {
  dayTimeRangeMode: 'FOCUS',
  weekTimeRangeMode: 'FOCUS',
  focusStartTime: 8, // 08:00
  focusEndTime: 23, // 23:00
  offHoursDisplay: 'COLLAPSED',
  offHoursDenseScaleFactor: 0.35,
};

export interface TimeRangeConfig {
  startHour: number;
  endHour: number;
  hours: number[];
  hourHeight: number;
  totalHeight: number;
  // Off-hours info for Focus mode
  hasNightBefore: boolean;
  hasNightAfter: boolean;
  nightBeforeHours: number; // Count of hours in 00:00–focusStart
  nightAfterHours: number; // Count of hours in focusEnd–24:00
}

/**
 * Calculate the time range configuration for a given view mode
 */
export function getTimeRangeConfig(
  mode: TimeRangeMode,
  settings: TimeRangeSettings,
  baseHourHeight: number
): TimeRangeConfig {
  if (mode === 'FULL_24H') {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return {
      startHour: 0,
      endHour: 24,
      hours,
      hourHeight: baseHourHeight,
      totalHeight: 24 * baseHourHeight,
      hasNightBefore: false,
      hasNightAfter: false,
      nightBeforeHours: 0,
      nightAfterHours: 0,
    };
  }

  // Focus mode
  const { focusStartTime, focusEndTime } = settings;
  const focusHourCount = focusEndTime - focusStartTime;
  const hours = Array.from({ length: focusHourCount }, (_, i) => i + focusStartTime);

  return {
    startHour: focusStartTime,
    endHour: focusEndTime,
    hours,
    hourHeight: baseHourHeight,
    totalHeight: focusHourCount * baseHourHeight,
    hasNightBefore: focusStartTime > 0,
    hasNightAfter: focusEndTime < 24,
    nightBeforeHours: focusStartTime,
    nightAfterHours: 24 - focusEndTime,
  };
}

/**
 * Calculate the vertical position of a task within the time grid
 * Returns null if the task is entirely outside the visible range
 */
export function getTaskPositionInRange(
  startTimeHours: number,
  endTimeHours: number,
  config: TimeRangeConfig
): { top: number; height: number; isPartialTop: boolean; isPartialBottom: boolean } | null {
  // Check if task overlaps with visible range
  if (endTimeHours <= config.startHour || startTimeHours >= config.endHour) {
    return null; // Entirely outside visible range
  }

  // Clamp to visible range
  const clampedStart = Math.max(startTimeHours, config.startHour);
  const clampedEnd = Math.min(endTimeHours, config.endHour);

  const top = (clampedStart - config.startHour) * config.hourHeight;
  const height = (clampedEnd - clampedStart) * config.hourHeight;

  return {
    top,
    height,
    isPartialTop: startTimeHours < config.startHour,
    isPartialBottom: endTimeHours > config.endHour,
  };
}

/**
 * Check if a time (in hours) falls within off-hours
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
 * Get tasks that fall within a specific off-hours range
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
  const hour = Math.floor(y / config.hourHeight) + config.startHour;
  return Math.max(config.startHour, Math.min(config.endHour - 1, hour));
}

/**
 * Format hour for display (e.g., 0 -> "12 AM", 13 -> "1 PM")
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
