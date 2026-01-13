import { cn } from "@/lib/utils";
import { Phase, Campaign, ZoomLevel, QUARTERS, MONTHS } from "@/types/planner";
import { MonthBlock } from "./MonthBlock";
import { BlockSize } from "./BlockSizeControl";

interface YearViewProps {
  year: number;
  phases: Phase[];
  campaigns: Campaign[];
  zoomLevel: ZoomLevel;
  focusedQuarter?: number;
  focusedMonth?: number;
  blockSize: BlockSize;
  currentMonth: number;
  onMonthClick: (monthIndex: number) => void;
  onQuarterClick: (quarterIndex: number) => void;
  onCampaignClick?: (campaign: Campaign) => void;
  onCampaignUpdate?: (campaign: Campaign) => void;
}

export function YearView({
  year,
  phases,
  campaigns,
  zoomLevel,
  focusedQuarter,
  focusedMonth,
  blockSize,
  currentMonth,
  onMonthClick,
  onQuarterClick,
  onCampaignClick,
  onCampaignUpdate,
}: YearViewProps) {
  const getPhaseForMonth = (monthIndex: number): Phase | undefined => {
    return phases.find(
      (phase) => monthIndex >= phase.startMonth && monthIndex <= phase.endMonth
    );
  };

  const getCampaignsForMonth = (monthIndex: number): Campaign[] => {
    return campaigns.filter((campaign) => campaign.month === monthIndex);
  };

  const isMonthActive = (monthIndex: number): boolean => {
    if (focusedMonth !== undefined) return monthIndex === focusedMonth;
    if (focusedQuarter !== undefined) {
      const quarter = QUARTERS[focusedQuarter - 1];
      return (quarter.months as readonly number[]).includes(monthIndex);
    }
    return true;
  };

  const isMonthFocused = (monthIndex: number): boolean => {
    return focusedMonth === monthIndex;
  };

  // Render quarters for quarter view
  if (zoomLevel === "quarter" && focusedQuarter) {
    const quarter = QUARTERS[focusedQuarter - 1];
    return (
      <div className="animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-light">{quarter.label}</h2>
          <span className="text-muted-foreground text-sm">{year}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {quarter.months.map((monthIndex) => (
            <MonthBlock
              key={monthIndex}
              monthIndex={monthIndex}
              phase={getPhaseForMonth(monthIndex)}
              campaigns={getCampaignsForMonth(monthIndex)}
              zoomLevel={zoomLevel}
              isActive={true}
              isFocused={focusedMonth === monthIndex}
              isCurrent={monthIndex === currentMonth}
              blockSize={blockSize}
              onClick={() => onMonthClick(monthIndex)}
              onCampaignClick={onCampaignClick}
              onCampaignUpdate={onCampaignUpdate}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render single month for month view
  if (zoomLevel === "month" && focusedMonth !== undefined) {
    return (
      <div className="animate-scale-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-light">{MONTHS[focusedMonth]}</h2>
          <span className="text-muted-foreground text-sm">{year}</span>
        </div>
        <MonthBlock
          monthIndex={focusedMonth}
          phase={getPhaseForMonth(focusedMonth)}
          campaigns={getCampaignsForMonth(focusedMonth)}
          zoomLevel={zoomLevel}
          isActive={true}
          isFocused={true}
          isCurrent={focusedMonth === currentMonth}
          blockSize={blockSize}
          onClick={() => {}}
          onCampaignClick={onCampaignClick}
          onCampaignUpdate={onCampaignUpdate}
        />
      </div>
    );
  }

  // Default year view
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-3xl font-light">{year}</h2>
        <span className="text-muted-foreground text-sm">Annual Overview</span>
      </div>

      {/* Quarters grid */}
      <div className="space-y-8">
        {QUARTERS.map((quarter, quarterIndex) => (
          <div key={quarter.label} className="group">
            <button
              onClick={() => onQuarterClick(quarterIndex + 1)}
              className={cn(
                "flex items-center gap-2 mb-4 transition-all duration-300 editorial-link",
                "text-sm text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="font-medium">{quarter.label}</span>
              <span className="text-xs opacity-60">
                {MONTHS[quarter.months[0]].slice(0, 3)} –{" "}
                {MONTHS[quarter.months[2]].slice(0, 3)}
              </span>
            </button>

            <div
              className={cn(
                "grid grid-cols-3 gap-3 transition-all duration-500",
                focusedQuarter &&
                  focusedQuarter !== quarterIndex + 1 &&
                  "focus-dimmed"
              )}
            >
              {quarter.months.map((monthIndex) => (
                <MonthBlock
                  key={monthIndex}
                  monthIndex={monthIndex}
                  phase={getPhaseForMonth(monthIndex)}
                  campaigns={getCampaignsForMonth(monthIndex)}
                  zoomLevel={zoomLevel}
                  isActive={isMonthActive(monthIndex)}
                  isFocused={isMonthFocused(monthIndex)}
                  isCurrent={monthIndex === currentMonth}
                  blockSize={blockSize}
                  onClick={() => onMonthClick(monthIndex)}
                  onCampaignClick={onCampaignClick}
                  onCampaignUpdate={onCampaignUpdate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
