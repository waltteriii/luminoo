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
  compact?: boolean; // Just show dot without text
}

const energyConfig: Record<EnergyLevel, { label: string; bg: string; text: string; dot: string }> = {
  high: { label: 'High Focus', bg: 'bg-energy-high/20', text: 'text-energy-high', dot: 'bg-energy-high' },
  medium: { label: 'Steady', bg: 'bg-energy-medium/20', text: 'text-energy-medium', dot: 'bg-energy-medium' },
  low: { label: 'Low Energy', bg: 'bg-energy-low/20', text: 'text-energy-low', dot: 'bg-energy-low' },
  recovery: { label: 'Recovery', bg: 'bg-energy-recovery/20', text: 'text-energy-recovery', dot: 'bg-energy-recovery' },
};

const EnergyPill = ({ energy, onChange, editable = false, size = 'sm', compact = false }: EnergyPillProps) => {
  const config = energyConfig[energy];

  // Compact mode: just a colored dot
  if (compact) {
    const dot = (
      <div 
        className={cn(
          "rounded-full transition-all",
          size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
          config.dot,
          editable && 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-background'
        )}
        title={config.label}
      />
    );

    if (!editable || !onChange) {
      return dot;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 -m-1.5 rounded hover:bg-secondary/50 transition-colors">
            {dot}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {(Object.keys(energyConfig) as EnergyLevel[]).map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => onChange(level)}
              className={cn(
                "flex items-center gap-2 min-h-[40px]",
                energy === level && "bg-secondary"
              )}
            >
              <span className={cn(
                "w-2.5 h-2.5 rounded-full",
                energyConfig[level].dot
              )} />
              <span className={energyConfig[level].text}>{energyConfig[level].label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full pill with text
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
        config.dot
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
              "flex items-center gap-2 min-h-[40px]",
              energy === level && "bg-secondary"
            )}
          >
            <span className={cn(
              "w-2.5 h-2.5 rounded-full",
              energyConfig[level].dot
            )} />
            <span className={energyConfig[level].text}>{energyConfig[level].label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnergyPill;
