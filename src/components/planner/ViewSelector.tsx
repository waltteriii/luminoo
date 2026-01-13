import { Grid3X3, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "circular";

interface ViewSelectorProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSelector({ view, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("grid")}
        className={cn(
          "h-7 px-2.5 rounded-md transition-all duration-200",
          view === "grid"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Grid view"
      >
        <Grid3X3 className="w-3.5 h-3.5 mr-1.5" />
        <span className="text-xs">Grid</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("circular")}
        className={cn(
          "h-7 px-2.5 rounded-md transition-all duration-200",
          view === "circular"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Circular view"
      >
        <Circle className="w-3.5 h-3.5 mr-1.5" />
        <span className="text-xs">Wheel</span>
      </Button>
    </div>
  );
}
