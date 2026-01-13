import { cn } from "@/lib/utils";
import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSettingsClick?: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="py-6 border-b border-border/40">
      <div className="calm-container flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-foreground/60" />
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight">Annual Planner</h1>
            <p className="text-xs text-muted-foreground">Align with your rhythm</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
