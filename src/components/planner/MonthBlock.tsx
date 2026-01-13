import { cn } from "@/lib/utils";
import { Phase, Campaign, ZoomLevel, MONTHS } from "@/types/planner";
import { InlineEditableText } from "./InlineEditableText";
import { BlockSize } from "./BlockSizeControl";

interface MonthBlockProps {
  monthIndex: number;
  phase?: Phase;
  campaigns: Campaign[];
  zoomLevel: ZoomLevel;
  isActive: boolean;
  isFocused: boolean;
  isCurrent: boolean;
  blockSize: BlockSize;
  onClick: () => void;
  onCampaignClick?: (campaign: Campaign) => void;
  onCampaignUpdate?: (campaign: Campaign) => void;
}

export function MonthBlock({
  monthIndex,
  phase,
  campaigns,
  zoomLevel,
  isActive,
  isFocused,
  isCurrent,
  blockSize,
  onClick,
  onCampaignClick,
  onCampaignUpdate,
}: MonthBlockProps) {
  const monthName = MONTHS[monthIndex];
  const shortMonth = monthName.slice(0, 3);

  // Determine visibility based on zoom level
  const showCampaigns = zoomLevel !== "year";
  const showDetails = zoomLevel === "month" && isFocused;

  // Size configurations
  const sizeConfig = {
    compact: {
      year: "p-2 min-h-[60px]",
      quarter: "p-3 min-h-[90px]",
      month: "p-4 min-h-[120px]",
      monthLabel: { year: "text-[10px]", quarter: "text-xs", month: "text-sm" },
      campaignPadding: { quarter: "px-1.5 py-0.5", month: "px-2 py-1" },
      campaignText: { quarter: "text-[9px]", month: "text-xs" },
    },
    comfortable: {
      year: "p-3 min-h-[80px]",
      quarter: "p-4 min-h-[120px]",
      month: "p-5 min-h-[160px]",
      monthLabel: { year: "text-xs", quarter: "text-sm", month: "text-base" },
      campaignPadding: { quarter: "px-2 py-1", month: "px-3 py-2" },
      campaignText: { quarter: "text-[11px]", month: "text-sm" },
    },
    spacious: {
      year: "p-4 min-h-[100px]",
      quarter: "p-5 min-h-[150px]",
      month: "p-6 min-h-[200px]",
      monthLabel: { year: "text-sm", quarter: "text-base", month: "text-lg" },
      campaignPadding: { quarter: "px-2.5 py-1.5", month: "px-4 py-2.5" },
      campaignText: { quarter: "text-xs", month: "text-base" },
    },
  };

  const config = sizeConfig[blockSize];

  const handleCampaignNameSave = (campaign: Campaign, newName: string) => {
    if (onCampaignUpdate) {
      onCampaignUpdate({ ...campaign, name: newName });
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative rounded-xl transition-all duration-500 ease-out text-left w-full",
        "hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Size based on zoom level and block size
        zoomLevel === "year" && config.year,
        zoomLevel === "quarter" && config.quarter,
        zoomLevel === "month" && config.month,
        // Phase coloring
        phase?.type === "planning" && "phase-planning",
        phase?.type === "creation" && "phase-creation",
        phase?.type === "launch" && "phase-launch",
        phase?.type === "reflection" && "phase-reflection",
        !phase && "bg-secondary/30",
        // Focus states
        isFocused && "ring-2 ring-foreground/10 shadow-lg",
        !isActive && "opacity-40",
        // Current month highlight
        isCurrent && "ring-2 ring-accent-foreground/30 shadow-md"
      )}
    >
      {/* Current month indicator */}
      {isCurrent && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-foreground/60 animate-breathe" />
      )}

      {/* Month label */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            "font-medium transition-all duration-300",
            zoomLevel === "year" && cn(config.monthLabel.year, "text-muted-foreground"),
            zoomLevel === "quarter" && cn(config.monthLabel.quarter, "text-foreground/80"),
            zoomLevel === "month" && cn(config.monthLabel.month, "text-foreground")
          )}
        >
          {zoomLevel === "year" ? shortMonth : monthName}
        </span>

        {/* Campaign count indicator (year view) */}
        {zoomLevel === "year" && campaigns.length > 0 && (
          <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
            {campaigns.length}
          </span>
        )}
      </div>

      {/* Phase indicator (year view) */}
      {zoomLevel === "year" && phase && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">
          {phase.name}
        </p>
      )}

      {/* Campaign list (quarter/month view) */}
      {showCampaigns && campaigns.length > 0 && (
        <div
          className={cn(
            "space-y-1.5 mt-2 transition-all duration-500",
            zoomLevel === "quarter" && "opacity-80",
            zoomLevel === "month" && "opacity-100"
          )}
        >
          {campaigns
            .slice(0, zoomLevel === "month" ? campaigns.length : 3)
            .map((campaign) => (
              <div
                key={campaign.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onCampaignClick?.(campaign);
                }}
                className={cn(
                  "rounded-md bg-background/40 backdrop-blur-sm transition-all duration-300",
                  "hover:bg-background/60 cursor-pointer",
                  zoomLevel === "quarter" && config.campaignPadding.quarter,
                  zoomLevel === "month" && config.campaignPadding.month
                )}
              >
                {zoomLevel === "month" && isFocused && onCampaignUpdate ? (
                  <InlineEditableText
                    value={campaign.name}
                    onSave={(newName) => handleCampaignNameSave(campaign, newName)}
                    className={cn("line-clamp-1", config.campaignText.month)}
                  />
                ) : (
                  <p
                    className={cn(
                      "line-clamp-1 transition-all duration-300",
                      zoomLevel === "quarter" && config.campaignText.quarter,
                      zoomLevel === "month" && config.campaignText.month
                    )}
                  >
                    {campaign.name}
                  </p>
                )}
                {showDetails && campaign.energyRequired && (
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        campaign.energyRequired === "high" && "bg-[hsl(var(--energy-high))]",
                        campaign.energyRequired === "medium" && "bg-[hsl(var(--energy-medium))]",
                        campaign.energyRequired === "low" && "bg-[hsl(var(--energy-low))]",
                        campaign.energyRequired === "recovery" && "bg-[hsl(var(--energy-recovery))]"
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {campaign.energyRequired} energy
                    </span>
                  </div>
                )}
              </div>
            ))}
          {zoomLevel === "quarter" && campaigns.length > 3 && (
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
