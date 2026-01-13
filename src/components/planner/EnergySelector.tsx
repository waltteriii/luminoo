import { cn } from "@/lib/utils";
import { EnergyState, ENERGY_LABELS } from "@/types/planner";

interface EnergySelectorProps {
  currentEnergy: EnergyState;
  onEnergyChange: (energy: EnergyState) => void;
}

const energyOptions: EnergyState[] = ['high', 'medium', 'low', 'recovery'];

export function EnergySelector({ currentEnergy, onEnergyChange }: EnergySelectorProps) {
  return (
    <div className="animate-fade-in">
      <p className="text-xs text-muted-foreground mb-3">How are you feeling?</p>
      <div className="flex gap-2">
        {energyOptions.map((energy) => (
          <button
            key={energy}
            onClick={() => onEnergyChange(energy)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
              "text-sm hover-lift",
              currentEnergy === energy
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full transition-transform duration-300",
                currentEnergy === energy && "scale-125",
                energy === 'high' && "bg-energy-high",
                energy === 'medium' && "bg-energy-medium",
                energy === 'low' && "bg-energy-low",
                energy === 'recovery' && "bg-energy-recovery"
              )}
            />
            <span className="hidden sm:inline">{ENERGY_LABELS[energy]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
