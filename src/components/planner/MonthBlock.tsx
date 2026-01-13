import { cn } from "@/lib/utils";
import { Phase, Campaign, ZoomLevel, MONTHS } from "@/types/planner";

interface MonthBlockProps {
  monthIndex: number;
  phase?: Phase;
  campaigns: Campaign[];
  zoomLevel: ZoomLevel;
  isActive: boolean;
  isFocused: boolean;
  onClick: () => void;
}

export function MonthBlock({
  monthIndex,
  phase,
  campaigns,
  zoomLevel,
  isActive,
  isFocused,
  onClick,
}: MonthBlockProps) {
  const monthName = MONTHS[monthIndex];
  const shortMonth = monthName.slice(0, 3);
  
  // Determine visibility based on zoom level
  const showCampaigns = zoomLevel !== 'year';
  const showDetails = zoomLevel === 'month' && isFocused;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative rounded-xl transition-all duration-500 ease-out text-left",
        "hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Size based on zoom level
        zoomLevel === 'year' && "p-3 min-h-[80px]",
        zoomLevel === 'quarter' && "p-4 min-h-[120px]",
        zoomLevel === 'month' && "p-5 min-h-[160px]",
        // Phase coloring
        phase?.type === 'planning' && "phase-planning",
        phase?.type === 'creation' && "phase-creation",
        phase?.type === 'launch' && "phase-launch",
        phase?.type === 'reflection' && "phase-reflection",
        !phase && "bg-secondary/30",
        // Focus states
        isFocused && "ring-2 ring-foreground/10 shadow-lg",
        !isActive && "opacity-40"
      )}
    >
      {/* Month label */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            "font-medium transition-all duration-300",
            zoomLevel === 'year' && "text-xs text-muted-foreground",
            zoomLevel === 'quarter' && "text-sm text-foreground/80",
            zoomLevel === 'month' && "text-base text-foreground"
          )}
        >
          {zoomLevel === 'year' ? shortMonth : monthName}
        </span>
        
        {/* Campaign count indicator (year view) */}
        {zoomLevel === 'year' && campaigns.length > 0 && (
          <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
            {campaigns.length}
          </span>
        )}
      </div>

      {/* Phase indicator (year view) */}
      {zoomLevel === 'year' && phase && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">
          {phase.name}
        </p>
      )}

      {/* Campaign list (quarter/month view) */}
      {showCampaigns && campaigns.length > 0 && (
        <div
          className={cn(
            "space-y-1.5 mt-2 transition-all duration-500",
            zoomLevel === 'quarter' && "opacity-80",
            zoomLevel === 'month' && "opacity-100"
          )}
        >
          {campaigns.slice(0, zoomLevel === 'month' ? campaigns.length : 3).map((campaign) => (
            <div
              key={campaign.id}
              className={cn(
                "rounded-md bg-background/40 backdrop-blur-sm transition-all duration-300",
                zoomLevel === 'quarter' && "px-2 py-1",
                zoomLevel === 'month' && "px-3 py-2"
              )}
            >
              <p
                className={cn(
                  "line-clamp-1 transition-all duration-300",
                  zoomLevel === 'quarter' && "text-[11px]",
                  zoomLevel === 'month' && "text-sm"
                )}
              >
                {campaign.name}
              </p>
              {showDetails && campaign.energyRequired && (
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      campaign.energyRequired === 'high' && "bg-energy-high",
                      campaign.energyRequired === 'medium' && "bg-energy-medium",
                      campaign.energyRequired === 'low' && "bg-energy-low",
                      campaign.energyRequired === 'recovery' && "bg-energy-recovery"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {campaign.energyRequired} energy
                  </span>
                </div>
              )}
            </div>
          ))}
          {zoomLevel === 'quarter' && campaigns.length > 3 && (
            <p className="text-[10px] text-muted-foreground/60 pl-2">
              +{campaigns.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Hover indicator */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl border-2 border-foreground/0 transition-all duration-300",
          "group-hover:border-foreground/5"
        )}
      />
    </button>
  );
}
