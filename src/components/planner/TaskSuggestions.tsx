import { cn } from "@/lib/utils";
import { EnergyState, Task, ENERGY_LABELS } from "@/types/planner";
import { Sparkles, ArrowRight } from "lucide-react";

interface TaskSuggestionsProps {
  currentEnergy: EnergyState;
  tasks: Task[];
}

export function TaskSuggestions({ currentEnergy, tasks }: TaskSuggestionsProps) {
  // Filter tasks suitable for current energy state
  const suitableTasks = tasks.filter((task) => {
    if (task.completed) return false;
    if (task.suitableStates?.includes(currentEnergy)) return true;
    if (task.energyLevel === currentEnergy) return true;
    // Low energy can do recovery tasks, recovery can do low energy tasks
    if (currentEnergy === 'low' && task.energyLevel === 'recovery') return true;
    if (currentEnergy === 'recovery' && task.energyLevel === 'low') return true;
    return false;
  });

  if (suitableTasks.length === 0) {
    return (
      <div className="animate-fade-in p-6 rounded-xl bg-secondary/30 text-center">
        <p className="text-muted-foreground text-sm">
          {currentEnergy === 'recovery' ? (
            "Rest is productive. Take the time you need."
          ) : (
            "No tasks match your current energy. That's okay."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="w-4 h-4" />
        <p className="text-sm">
          Suggested for <span className="text-foreground">{ENERGY_LABELS[currentEnergy]}</span>
        </p>
      </div>

      <div className="space-y-2">
        {suitableTasks.slice(0, 3).map((task) => (
          <button
            key={task.id}
            className={cn(
              "w-full group flex items-center justify-between p-4 rounded-xl",
              "bg-card border border-border/50 hover:border-border",
              "transition-all duration-300 hover-lift text-left"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  task.energyLevel === 'high' && "bg-energy-high",
                  task.energyLevel === 'medium' && "bg-energy-medium",
                  task.energyLevel === 'low' && "bg-energy-low",
                  task.energyLevel === 'recovery' && "bg-energy-recovery"
                )}
              />
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                {task.duration && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ~{task.duration}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-all duration-300",
                "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              )}
            />
          </button>
        ))}
      </div>

      {suitableTasks.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{suitableTasks.length - 3} more tasks available
        </p>
      )}
    </div>
  );
}
