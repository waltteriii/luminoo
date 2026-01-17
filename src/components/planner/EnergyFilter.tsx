import { EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Filter, X, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EnergyFilterProps {
  selectedEnergies: EnergyLevel[];
  onToggleEnergy: (energy: EnergyLevel) => void;
  onClear: () => void;
}

const ENERGY_CONFIG: { value: EnergyLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High Focus', color: 'bg-energy-high' },
  { value: 'medium', label: 'Steady', color: 'bg-energy-medium' },
  { value: 'low', label: 'Low Energy', color: 'bg-energy-low' },
  { value: 'recovery', label: 'Recovery', color: 'bg-energy-recovery' },
];

const EnergyFilter = ({ selectedEnergies, onToggleEnergy, onClear }: EnergyFilterProps) => {
  const hasFilters = selectedEnergies.length > 0;

  return (
    <div className="flex items-center gap-1">
      {/* Quick "Show All" button */}
      <Button
        variant={!hasFilters ? 'default' : 'outline'}
        size="sm"
        onClick={onClear}
        className={cn(
          "gap-2",
          !hasFilters && "bg-primary text-primary-foreground"
        )}
      >
        All
      </Button>

      {/* Individual energy toggles */}
      {ENERGY_CONFIG.map((energy) => {
        const isSelected = selectedEnergies.includes(energy.value);
        return (
          <Button
            key={energy.value}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggleEnergy(energy.value)}
            className={cn(
              "gap-2",
              isSelected && "bg-primary text-primary-foreground"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", energy.color)} />
            <span className="hidden sm:inline">{energy.label}</span>
          </Button>
        );
      })}

      {/* More options popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-foreground-muted uppercase">Energy Levels</span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {ENERGY_CONFIG.map((energy) => {
              const isSelected = selectedEnergies.includes(energy.value);
              return (
                <button
                  key={energy.value}
                  onClick={() => onToggleEnergy(energy.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm",
                    isSelected
                      ? "bg-secondary text-foreground"
                      : "text-foreground-muted hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full", energy.color)} />
                  <span>{energy.label}</span>
                  {isSelected && (
                    <Check className="ml-auto w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EnergyFilter;
