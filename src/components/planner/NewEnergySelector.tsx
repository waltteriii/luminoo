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
}

const energyOptions: { value: EnergyLevel; label: string; description: string }[] = [
  { value: 'high', label: 'High Focus', description: 'Deep work, complex tasks' },
  { value: 'medium', label: 'Steady', description: 'Regular tasks, creative work' },
  { value: 'low', label: 'Low Energy', description: 'Routine tasks, admin' },
  { value: 'recovery', label: 'Recovery', description: 'Rest, reflection' },
];

const EnergySelector = ({ value, onChange }: EnergySelectorProps) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {energyOptions.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(option.value)}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
                  "text-sm font-medium",
                  value === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
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
              {option.description}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default EnergySelector;
