/**
 * Normalize time strings to HH:MM format.
 * Handles HH:MM, HH:MM:SS, or null/undefined values.
 */
export const normalizeTime = (time: string | null | undefined): string | null => {
  if (!time) return null;
  // Strip seconds if present (HH:MM:SS -> HH:MM)
  return time.slice(0, 5);
};

/**
 * Parse a time string into hours as a decimal (e.g., "09:30" -> 9.5)
 */
export const parseTimeToHours = (time: string | null | undefined): number | null => {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  
  const [h, m] = normalized.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  
  return h + m / 60;
};

/**
 * Format hours decimal back to HH:MM string
 */
export const formatHoursToTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Calculate duration in minutes between two time strings
 */
export const getTimeDurationMinutes = (
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number => {
  const startHours = parseTimeToHours(startTime);
  const endHours = parseTimeToHours(endTime);
  
  if (startHours === null || endHours === null) return 60; // Default 1 hour
  
  return Math.max(15, (endHours - startHours) * 60);
};
