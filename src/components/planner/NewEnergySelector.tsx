import { cn } from '@/lib/utils';
import { EnergyLevel } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnergySelectorProps {
  value: EnergyLevel;
  onChange: (energy: EnergyLevel) => void;
  onFilterClick?: (energy: EnergyLevel) => void;
  activeFilters?: EnergyLevel[];
  onShowAll?: () => void;
  onViewInbox?: (energy: EnergyLevel) => void;
  onAddTask?: () => void;
  onBrainDump?: () => void;
}

const energyOptions: { value: EnergyLevel; label: string; description: string }[] = [
  { value: 'high', label: 'High Focus', description: 'Deep work, complex tasks' },
  { value: 'medium', label: 'Steady', description: 'Regular tasks, creative work' },
  { value: 'low', label: 'Low Energy', description: 'Routine tasks, admin' },
  { value: 'recovery', label: 'Recovery', description: 'Rest, reflection' },
];

const EnergySelector = ({ 
  value, 
  onChange, 
  onFilterClick, 
  activeFilters = [], 
  onShowAll, 
  onViewInbox,
  onAddTask,
  onBrainDump
}: EnergySelectorProps) => {
  const handleClick = (energy: EnergyLevel) => {
    if (onFilterClick) {
      onFilterClick(energy);
    } else {
      onChange(energy);
    }
  };

  const handleDoubleClick = (energy: EnergyLevel) => {
    // Double-click shows only this energy level
    if (onViewInbox) {
      onViewInbox(energy);
    } else {
      onChange(energy);
    }
  };

  const showAllActive = activeFilters.length === 0;

  const handleShowAll = () => {
    if (onShowAll) {
      onShowAll();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Quick action buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground-muted hover:text-foreground hover:bg-primary/10"
                onClick={onAddTask}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Add task</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground-muted hover:text-foreground hover:bg-primary/10"
                onClick={onBrainDump}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Brain dump</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Energy filter buttons */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          {/* Show All button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleShowAll}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                  "text-sm font-medium",
                  showAllActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground hover:bg-background/50"
                )}
              >
                <span>All</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Show all energy levels</p>
            </TooltipContent>
          </Tooltip>

          {energyOptions.map((option) => {
            const isFiltered = activeFilters.includes(option.value);
            const isOnlyActive = activeFilters.length === 1 && activeFilters[0] === option.value;
            
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleClick(option.value)}
                    onDoubleClick={() => handleDoubleClick(option.value)}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                      "text-sm font-medium",
                      isOnlyActive
                        ? "bg-background text-foreground shadow-sm"
                        : isFiltered
                          ? "bg-background/70 text-foreground"
                          : "text-foreground-muted hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        isFiltered && "ring-2 ring-offset-1 ring-offset-secondary",
                        option.value === 'high' && "bg-energy-high",
                        option.value === 'medium' && "bg-energy-medium",
                        option.value === 'low' && "bg-energy-low",
                        option.value === 'recovery' && "bg-energy-recovery",
                        option.value === 'high' && isFiltered && "ring-energy-high/50",
                        option.value === 'medium' && isFiltered && "ring-energy-medium/50",
                        option.value === 'low' && isFiltered && "ring-energy-low/50",
                        option.value === 'recovery' && isFiltered && "ring-energy-recovery/50"
                      )}
                    />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{option.description}</p>
                  <p className="text-foreground-muted mt-1">Click to toggle • Double-click to focus</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnergySelector;
