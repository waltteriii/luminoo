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
}

const energyOptions: { value: EnergyLevel; label: string; description: string }[] = [
  { value: 'high', label: 'High Focus', description: 'Deep work, complex tasks' },
  { value: 'medium', label: 'Steady', description: 'Regular tasks, creative work' },
  { value: 'low', label: 'Low Energy', description: 'Routine tasks, admin' },
  { value: 'recovery', label: 'Recovery', description: 'Rest, reflection' },
];

const EnergySelector = ({ value, onChange, onFilterClick, activeFilters = [] }: EnergySelectorProps) => {
  const handleClick = (energy: EnergyLevel) => {
    if (onFilterClick) {
      // If filter handler provided, toggle filter on click
      onFilterClick(energy);
    } else {
      // Otherwise just set the value
      onChange(energy);
    }
  };

  const handleDoubleClick = (energy: EnergyLevel) => {
    // Double click sets as current energy
    onChange(energy);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
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
