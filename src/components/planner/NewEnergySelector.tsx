import { cn } from '@/lib/utils';
import { EnergyLevel } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnergySelectorProps {
  value: EnergyLevel;
  onChange: (energy: EnergyLevel) => void;
  onFilterClick?: (energy: EnergyLevel) => void;
  activeFilters?: EnergyLevel[];
  onShowAll?: () => void;
}

const energyOptions: { value: EnergyLevel; label: string; description: string }[] = [
  { value: 'high', label: 'High Focus', description: 'Deep work, complex tasks' },
  { value: 'medium', label: 'Steady', description: 'Regular tasks, creative work' },
  { value: 'low', label: 'Low Energy', description: 'Routine tasks, admin' },
  { value: 'recovery', label: 'Recovery', description: 'Rest, reflection' },
];

const EnergySelector = ({ value, onChange, onFilterClick, activeFilters = [], onShowAll }: EnergySelectorProps) => {
  const handleClick = (energy: EnergyLevel) => {
    if (onFilterClick) {
      onFilterClick(energy);
    } else {
      onChange(energy);
    }
  };

  const handleDoubleClick = (energy: EnergyLevel) => {
    onChange(energy);
  };

  const showAllActive = activeFilters.length === 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {/* Show All button */}
        {onShowAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onShowAll}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                  "text-sm font-medium",
                  showAllActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                <span className="hidden sm:inline">All</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Show all energy levels</p>
            </TooltipContent>
          </Tooltip>
        )}

        {energyOptions.map((option) => {
          const isActive = value === option.value;
          const isFiltered = activeFilters.includes(option.value);
          
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(option.value)}
                  onDoubleClick={() => handleDoubleClick(option.value)}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                    "text-sm font-medium",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : isFiltered
                        ? "bg-background/50 text-foreground ring-1 ring-primary/30"
                        : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full transition-transform",
                      isFiltered && "scale-125",
                      option.value === 'high' && "bg-energy-high",
                      option.value === 'medium' && "bg-energy-medium",
                      option.value === 'low' && "bg-energy-low",
                      option.value === 'recovery' && "bg-energy-recovery"
                    )}
                  />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{option.description}</p>
                {onFilterClick && (
                  <p className="text-foreground-muted mt-1">Click to filter • Double-click to set state</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default EnergySelector;
