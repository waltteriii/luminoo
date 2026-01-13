import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTHS } from "@/types/planner";
import { cn } from "@/lib/utils";

interface TodayIndicatorProps {
  onJumpToToday: () => void;
  currentMonth: number;
}

export function TodayIndicator({ onJumpToToday, currentMonth }: TodayIndicatorProps) {
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onJumpToToday}
      className={cn(
        "h-8 px-3 gap-1.5 rounded-lg transition-all duration-300",
        "text-xs font-medium",
        isCurrentMonth
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <CalendarDays className="w-3.5 h-3.5" />
      <span>Today</span>
      <span className="text-muted-foreground">·</span>
      <span>{MONTHS[today.getMonth()].slice(0, 3)} {today.getDate()}</span>
    </Button>
  );
}
