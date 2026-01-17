import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/types';
import { Calendar, CalendarDays, LayoutGrid, Clock } from 'lucide-react';

interface ViewSelectorProps {
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
}

const views: { value: ZoomLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'year', label: 'Year', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'month', label: 'Month', icon: <Calendar className="w-4 h-4" /> },
  { value: 'week', label: 'Week', icon: <CalendarDays className="w-4 h-4" /> },
  { value: 'day', label: 'Day', icon: <Clock className="w-4 h-4" /> },
];

const ViewSelector = ({ zoomLevel, onZoomLevelChange }: ViewSelectorProps) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
      {views.map((view) => (
        <button
          key={view.value}
          onClick={() => onZoomLevelChange(view.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            zoomLevel === view.value
              ? "bg-background text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          )}
        >
          {view.icon}
          <span className="hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewSelector;
