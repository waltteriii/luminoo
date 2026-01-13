import { cn } from "@/lib/utils";
import { Layers, Minus, Plus } from "lucide-react";

type InformationDensity = 'minimal' | 'balanced' | 'detailed';

interface DensityControlProps {
  density: InformationDensity;
  onDensityChange: (density: InformationDensity) => void;
}

const densityOptions: { value: InformationDensity; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

export function DensityControl({ density, onDensityChange }: DensityControlProps) {
  const currentIndex = densityOptions.findIndex((d) => d.value === density);

  const decrease = () => {
    if (currentIndex > 0) {
      onDensityChange(densityOptions[currentIndex - 1].value);
    }
  };

  const increase = () => {
    if (currentIndex < densityOptions.length - 1) {
      onDensityChange(densityOptions[currentIndex + 1].value);
    }
  };

  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <Layers className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground hidden sm:inline">Info density</span>
      
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
        <button
          onClick={decrease}
          disabled={currentIndex === 0}
          className={cn(
            "p-1.5 rounded-md transition-all duration-200",
            currentIndex === 0
              ? "text-muted-foreground/30"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          <Minus className="w-3 h-3" />
        </button>
        
        <span className="px-2 text-xs text-muted-foreground min-w-[60px] text-center">
          {densityOptions[currentIndex].label}
        </span>
        
        <button
          onClick={increase}
          disabled={currentIndex === densityOptions.length - 1}
          className={cn(
            "p-1.5 rounded-md transition-all duration-200",
            currentIndex === densityOptions.length - 1
              ? "text-muted-foreground/30"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
