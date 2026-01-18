import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CurrentTimeIndicatorProps {
  startHour?: number; // Default 0 (midnight)
  endHour?: number; // Default 24 (end of day)
  hourHeight?: number; // Height of each hour slot in pixels
  timezone?: string;
}

const CurrentTimeIndicator = ({ 
  startHour = 0, 
  endHour = 24,
  hourHeight = 80,
  timezone = 'UTC'
}: CurrentTimeIndicatorProps) => {
  const [position, setPosition] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      
      // Apply timezone if specified
      let hours = now.getHours();
      let minutes = now.getMinutes();
      
      if (timezone !== 'UTC') {
        try {
          const formatted = now.toLocaleString('en-US', { 
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
          });
          const [h, m] = formatted.split(':').map(Number);
          hours = h;
          minutes = m;
        } catch {
          // Fallback to local time
        }
      }
      
      const totalMinutes = hours * 60 + minutes;
      const startMinutes = startHour * 60;
      const endMinutes = endHour * 60;
      
      // Only show if current time is within the visible range
      if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
        const minutesSinceStart = totalMinutes - startMinutes;
        const pixelPosition = (minutesSinceStart / 60) * hourHeight;
        setPosition(pixelPosition);
        
        // Format time
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone !== 'UTC' ? timezone : undefined
        });
        setCurrentTime(timeStr);
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startHour, endHour, hourHeight, timezone]);

  if (position === null) return null;

  return (
    <div 
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: position }}
    >
      <div className="relative flex items-center">
        {/* Time label */}
        <div className="absolute -left-1 -translate-y-1/2 bg-highlight text-white text-2xs px-1.5 py-0.5 rounded font-medium">
          {currentTime}
        </div>
        
        {/* Dot at the start of the line */}
        <div className="w-2 h-2 rounded-full bg-highlight ml-14 -translate-y-1/2" />
        
        {/* Line across the time grid */}
        <div className="flex-1 h-0.5 bg-highlight" />
      </div>
    </div>
  );
};

export default CurrentTimeIndicator;
