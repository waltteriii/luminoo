import { cn } from "@/lib/utils";
import { Phase, Campaign, ZoomLevel, MONTHS, QUARTERS } from "@/types/planner";
import { BlockSize } from "./BlockSizeControl";

interface CircularYearViewProps {
  year: number;
  phases: Phase[];
  campaigns: Campaign[];
  zoomLevel: ZoomLevel;
  focusedQuarter?: number;
  focusedMonth?: number;
  onMonthClick: (monthIndex: number) => void;
  onQuarterClick: (quarterIndex: number) => void;
  blockSize: BlockSize;
  currentMonth: number;
}

export function CircularYearView({
  year,
  phases,
  campaigns,
  zoomLevel,
  focusedQuarter,
  focusedMonth,
  onMonthClick,
  blockSize,
  currentMonth,
}: CircularYearViewProps) {
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

  // Size configurations
  const sizeConfig = {
    compact: { radius: 140, monthSize: 44, fontSize: "text-[10px]", centerSize: 80 },
    comfortable: { radius: 180, monthSize: 56, fontSize: "text-xs", centerSize: 100 },
    spacious: { radius: 220, monthSize: 68, fontSize: "text-sm", centerSize: 120 },
  };

  const config = sizeConfig[blockSize];
  const centerX = config.radius + config.monthSize;
  const centerY = config.radius + config.monthSize;
  const svgSize = (config.radius + config.monthSize) * 2;

  // Get quarter for a month
  const getQuarterForMonth = (monthIndex: number): number => {
    return Math.floor(monthIndex / 3);
  };

  // Quarter colors
  const quarterColors = [
    "hsl(var(--phase-planning))",
    "hsl(var(--phase-creation))",
    "hsl(var(--phase-launch))",
    "hsl(var(--phase-reflection))",
  ];

  return (
    <div className="animate-fade-in flex flex-col items-center">
      <div className="flex items-center gap-3 mb-8 self-start">
        <h2 className="text-3xl font-light">{year}</h2>
        <span className="text-muted-foreground text-sm">Year Wheel</span>
      </div>

      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        {/* Quarter background segments */}
        <svg
          width={svgSize}
          height={svgSize}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}
        >
          {QUARTERS.map((quarter, qi) => {
            const startAngle = (qi * 90 * Math.PI) / 180;
            const endAngle = ((qi + 1) * 90 * Math.PI) / 180;
            const innerRadius = config.centerSize / 2 + 10;
            const outerRadius = config.radius - 10;

            const x1 = centerX + Math.cos(startAngle) * innerRadius;
            const y1 = centerY + Math.sin(startAngle) * innerRadius;
            const x2 = centerX + Math.cos(startAngle) * outerRadius;
            const y2 = centerY + Math.sin(startAngle) * outerRadius;
            const x3 = centerX + Math.cos(endAngle) * outerRadius;
            const y3 = centerY + Math.sin(endAngle) * outerRadius;
            const x4 = centerX + Math.cos(endAngle) * innerRadius;
            const y4 = centerY + Math.sin(endAngle) * innerRadius;

            const d = `
              M ${x1} ${y1}
              L ${x2} ${y2}
              A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
              L ${x4} ${y4}
              A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
            `;

            return (
              <path
                key={quarter.label}
                d={d}
                fill={quarterColors[qi]}
                opacity={focusedQuarter && focusedQuarter !== qi + 1 ? 0.2 : 0.3}
                className="transition-opacity duration-500"
              />
            );
          })}
        </svg>

        {/* Center circle with year */}
        <div
          className={cn(
            "absolute rounded-full bg-background border border-border/50",
            "flex flex-col items-center justify-center",
            "shadow-sm transition-all duration-300"
          )}
          style={{
            width: config.centerSize,
            height: config.centerSize,
            left: centerX - config.centerSize / 2,
            top: centerY - config.centerSize / 2,
          }}
        >
          <span className="text-2xl font-light text-foreground">{year}</span>
          <span className="text-[10px] text-muted-foreground">Annual</span>
        </div>

        {/* Month blocks arranged in circle */}
        {MONTHS.map((month, monthIndex) => {
          // Start from top (January at 12 o'clock position)
          const angle = ((monthIndex * 30 - 90) * Math.PI) / 180;
          const x = centerX + Math.cos(angle) * config.radius - config.monthSize / 2;
          const y = centerY + Math.sin(angle) * config.radius - config.monthSize / 2;

          const phase = getPhaseForMonth(monthIndex);
          const monthCampaigns = getCampaignsForMonth(monthIndex);
          const isActive = isMonthActive(monthIndex);
          const isCurrent = monthIndex === currentMonth;
          const isFocused = focusedMonth === monthIndex;

          return (
            <button
              key={monthIndex}
              onClick={() => onMonthClick(monthIndex)}
              className={cn(
                "absolute rounded-full transition-all duration-500 ease-out",
                "flex flex-col items-center justify-center",
                "hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // Phase coloring
                phase?.type === "planning" && "phase-planning",
                phase?.type === "creation" && "phase-creation",
                phase?.type === "launch" && "phase-launch",
                phase?.type === "reflection" && "phase-reflection",
                !phase && "bg-secondary/50",
                // Focus states
                isFocused && "ring-2 ring-foreground/20 scale-110",
                !isActive && "opacity-30",
                // Current month highlight
                isCurrent && "ring-2 ring-accent-foreground/40 shadow-md"
              )}
              style={{
                width: config.monthSize,
                height: config.monthSize,
                left: x,
                top: y,
              }}
            >
              <span className={cn(config.fontSize, "font-medium text-foreground/80")}>
                {month.slice(0, 3)}
              </span>
              {monthCampaigns.length > 0 && (
                <span className="text-[9px] text-muted-foreground">
                  {monthCampaigns.length}
                </span>
              )}
              {isCurrent && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent-foreground/60" />
              )}
            </button>
          );
        })}

        {/* Current time indicator line */}
        {zoomLevel === "year" && (
          <div
            className="absolute bg-accent-foreground/30 transition-transform duration-300"
            style={{
              width: 2,
              height: config.radius - config.centerSize / 2 - 20,
              left: centerX - 1,
              top: config.monthSize,
              transformOrigin: `1px ${centerY - config.monthSize}px`,
              transform: `rotate(${(currentMonth * 30)}deg)`,
            }}
          />
        )}
      </div>

      {/* Quarter labels */}
      <div className="flex items-center gap-6 mt-8">
        {QUARTERS.map((quarter, qi) => (
          <div
            key={quarter.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-opacity duration-300",
              focusedQuarter && focusedQuarter !== qi + 1
                ? "opacity-40"
                : "opacity-100"
            )}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: quarterColors[qi] }}
            />
            <span className="text-muted-foreground">{quarter.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
