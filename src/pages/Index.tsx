import { useState } from "react";
import { Header } from "@/components/planner/Header";
import { EnergySelector } from "@/components/planner/EnergySelector";
import { ZoomControls } from "@/components/planner/ZoomControls";
import { DensityControl } from "@/components/planner/DensityControl";
import { YearView } from "@/components/planner/YearView";
import { TaskSuggestions } from "@/components/planner/TaskSuggestions";
import { samplePhases, sampleCampaigns, sampleTasks } from "@/data/sampleData";
import { UserState, QUARTERS } from "@/types/planner";
import { cn } from "@/lib/utils";

const Index = () => {
  const [userState, setUserState] = useState<UserState>({
    currentEnergy: 'medium',
    zoomLevel: 'year',
    focusedQuarter: undefined,
    focusedMonth: undefined,
    timeModel: 'state-based',
    showCompleted: false,
    informationDensity: 'minimal',
  });

  const currentYear = new Date().getFullYear();

  const handleMonthClick = (monthIndex: number) => {
    // Find which quarter contains this month
    const quarterIndex = QUARTERS.findIndex((q) =>
      (q.months as readonly number[]).includes(monthIndex)
    );

    if (userState.zoomLevel === 'year') {
      // From year view, zoom into quarter
      setUserState((prev) => ({
        ...prev,
        zoomLevel: 'quarter',
        focusedQuarter: quarterIndex + 1,
        focusedMonth: undefined,
      }));
    } else if (userState.zoomLevel === 'quarter') {
      // From quarter view, zoom into month
      setUserState((prev) => ({
        ...prev,
        zoomLevel: 'month',
        focusedMonth: monthIndex,
      }));
    }
  };

  const handleQuarterClick = (quarterIndex: number) => {
    setUserState((prev) => ({
      ...prev,
      zoomLevel: 'quarter',
      focusedQuarter: quarterIndex,
      focusedMonth: undefined,
    }));
  };

  const handleZoomChange = (level: typeof userState.zoomLevel) => {
    if (level === 'year') {
      setUserState((prev) => ({
        ...prev,
        zoomLevel: level,
        focusedQuarter: undefined,
        focusedMonth: undefined,
      }));
    } else if (level === 'quarter') {
      // If going to quarter and no quarter selected, select Q1
      setUserState((prev) => ({
        ...prev,
        zoomLevel: level,
        focusedQuarter: prev.focusedQuarter || 1,
        focusedMonth: undefined,
      }));
    } else if (level === 'month') {
      // If going to month and no month selected, select first month of quarter
      const quarter = QUARTERS[(userState.focusedQuarter || 1) - 1];
      setUserState((prev) => ({
        ...prev,
        zoomLevel: level,
        focusedMonth: prev.focusedMonth ?? quarter.months[0],
      }));
    }
  };

  const handleClearFocus = () => {
    setUserState((prev) => ({
      ...prev,
      zoomLevel: 'year',
      focusedQuarter: undefined,
      focusedMonth: undefined,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="calm-container py-8 md:py-12">
        {/* Controls bar */}
        <div
          className={cn(
            "flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10",
            "pb-6 border-b border-border/30"
          )}
        >
          <EnergySelector
            currentEnergy={userState.currentEnergy}
            onEnergyChange={(energy) =>
              setUserState((prev) => ({ ...prev, currentEnergy: energy }))
            }
          />

          <div className="flex items-center gap-4">
            <DensityControl
              density={userState.informationDensity}
              onDensityChange={(density) =>
                setUserState((prev) => ({ ...prev, informationDensity: density }))
              }
            />
            <ZoomControls
              zoomLevel={userState.zoomLevel}
              onZoomChange={handleZoomChange}
              focusedQuarter={userState.focusedQuarter}
              focusedMonth={userState.focusedMonth}
              onClearFocus={handleClearFocus}
            />
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          {/* Year view */}
          <div className="min-w-0">
            <YearView
              year={currentYear}
              phases={samplePhases}
              campaigns={sampleCampaigns}
              zoomLevel={userState.zoomLevel}
              focusedQuarter={userState.focusedQuarter}
              focusedMonth={userState.focusedMonth}
              onMonthClick={handleMonthClick}
              onQuarterClick={handleQuarterClick}
            />
          </div>

          {/* Sidebar with task suggestions */}
          <aside
            className={cn(
              "space-y-8 lg:border-l lg:border-border/30 lg:pl-8",
              userState.informationDensity === 'minimal' && "hidden lg:block"
            )}
          >
            <TaskSuggestions
              currentEnergy={userState.currentEnergy}
              tasks={sampleTasks}
            />

            {/* Gentle reminder */}
            <div className="p-5 rounded-xl bg-accent/50 animate-fade-in-delayed">
              <p className="text-sm text-accent-foreground/80 leading-relaxed">
                Your pace is valid. This planner adapts to you, not the other way around.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
