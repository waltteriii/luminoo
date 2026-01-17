import { cn } from '@/lib/utils';
import { EnergyLevel } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnergyPillProps {
  energy: EnergyLevel;
  onChange?: (energy: EnergyLevel) => void;
  editable?: boolean;
  size?: 'sm' | 'md';
}

const energyConfig: Record<EnergyLevel, { label: string; bg: string; text: string }> = {
  high: { label: 'High Focus', bg: 'bg-energy-high/20', text: 'text-energy-high' },
  medium: { label: 'Steady', bg: 'bg-energy-medium/20', text: 'text-energy-medium' },
  low: { label: 'Low Energy', bg: 'bg-energy-low/20', text: 'text-energy-low' },
  recovery: { label: 'Recovery', bg: 'bg-energy-recovery/20', text: 'text-energy-recovery' },
};

const EnergyPill = ({ energy, onChange, editable = false, size = 'sm' }: EnergyPillProps) => {
  const config = energyConfig[energy];

  const pill = (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full",
      config.bg,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      editable && 'cursor-pointer hover:ring-1 hover:ring-primary/30'
    )}>
      <span className={cn(
        "rounded-full",
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        energy === 'high' && 'bg-energy-high',
        energy === 'medium' && 'bg-energy-medium',
        energy === 'low' && 'bg-energy-low',
        energy === 'recovery' && 'bg-energy-recovery'
      )} />
      <span className={cn("font-medium", config.text)}>
        {config.label}
      </span>
    </div>
  );

  if (!editable || !onChange) {
    return pill;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {pill}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {(Object.keys(energyConfig) as EnergyLevel[]).map((level) => (
          <DropdownMenuItem
            key={level}
            onClick={() => onChange(level)}
            className={cn(
              "flex items-center gap-2",
              energy === level && "bg-secondary"
            )}
          >
            <span className={cn(
              "w-2 h-2 rounded-full",
              level === 'high' && 'bg-energy-high',
              level === 'medium' && 'bg-energy-medium',
              level === 'low' && 'bg-energy-low',
              level === 'recovery' && 'bg-energy-recovery'
            )} />
            {energyConfig[level].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnergyPill;
