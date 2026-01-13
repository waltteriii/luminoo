import { Minimize2, Square, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BlockSize = "compact" | "comfortable" | "spacious";

interface BlockSizeControlProps {
  size: BlockSize;
  onSizeChange: (size: BlockSize) => void;
}

const sizes: { value: BlockSize; label: string; icon: typeof Square }[] = [
  { value: "compact", label: "Compact", icon: Minimize2 },
  { value: "comfortable", label: "Comfortable", icon: Square },
  { value: "spacious", label: "Spacious", icon: Maximize2 },
];

export function BlockSizeControl({ size, onSizeChange }: BlockSizeControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Size</span>
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/50">
        {sizes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            onClick={() => onSizeChange(value)}
            className={cn(
              "h-6 w-6 p-0 rounded-md transition-all duration-200",
              size === value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
            title={label}
          >
            <Icon className="w-3 h-3" />
          </Button>
        ))}
      </div>
    </div>
  );
}
