import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PlannerView from '@/components/planner/PlannerView';
import UnscheduledTasks from '@/components/planner/UnscheduledTasks';
import HeroWidgets from '@/components/planner/HeroWidgets';
import DndProvider from '@/components/dnd/DndProvider';
import MemoryPanel from '@/components/memory/MemoryPanel';
import { TasksProvider, useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';

import { ViewMode, ZoomLevel, EnergyLevel, ParsedItem, Platform } from '@/types';

// Lazy load modals for better performance
const BrainDumpModal = lazy(() => import('@/components/brain-dump/BrainDumpModal'));
const ProfileModal = lazy(() => import('@/components/profile/ProfileModal'));
const TrendingTopicsModal = lazy(() => import('@/components/trends/TrendingTopicsModal'));
const FriendsModal = lazy(() => import('@/components/friends/FriendsModal'));
const QuickAddTaskDialog = lazy(() => import('@/components/tasks/QuickAddTaskDialog'));

interface UserProfile {
  creatorType: string | null;
  platforms: Platform[];
  nicheKeywords: string[];
  audienceDescription: string | null;
  aiProfileSummary: string | null;
  avatarUrl: string | null;
  defaultView: ZoomLevel | null;
  highlightColor: string | null;
}

// View state persistence keys
const VIEW_STATE_KEY = 'luminoo-view-state';
const HIGHLIGHT_KEY = 'luminoo-highlight';

// Load cached view state from localStorage
const loadCachedViewState = () => {
  try {
    const saved = localStorage.getItem(VIEW_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        zoomLevel: parsed.zoomLevel as ZoomLevel || 'year',
        focusedMonth: parsed.focusedMonth ?? null,
        focusedDate: parsed.focusedDate ? new Date(parsed.focusedDate) : null,
        viewMode: parsed.viewMode as ViewMode || 'grid',
      };
    }
  } catch {
    // Ignore errors
  }
  return null;
};

// Load cached highlight color
const loadCachedHighlight = (): string => {
  try {
    return localStorage.getItem(HIGHLIGHT_KEY) || 'blue';
  } catch {
    return 'blue';
  }
};

const cachedViewState = loadCachedViewState();
const cachedHighlight = loadCachedHighlight();

// Apply highlight immediately to prevent flash
if (cachedHighlight) {
  document.documentElement.setAttribute('data-highlight', cachedHighlight);
}

const Index = () => {
  // Use a dummy user for demo mode
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<{ id: string, email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    creatorType: 'content_creator',
    platforms: ['instagram', 'tiktok'],
    nicheKeywords: ['productivity', 'lifestyle'],
    audienceDescription: 'People looking for organization tips',
    aiProfileSummary: 'Productivity enthusiast',
    avatarUrl: null,
    defaultView: null,
    highlightColor: cachedHighlight,
  });

  const navigate = useNavigate();
  if (!session || !user) return null;

  return (
    <TasksProvider userId={user.id}>
      <AuthenticatedApp
        user={user}
        session={session}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        cachedViewState={cachedViewState}
        cachedHighlight={cachedHighlight}
      />
    </TasksProvider>
  );
};

const AuthenticatedApp = ({
  user,
  session,
  userProfile,
  setUserProfile,
  cachedViewState,
  cachedHighlight
}: {
  user: { id: string, email?: string },
  session: Session,
  userProfile: UserProfile,
  setUserProfile: any,
  cachedViewState: any,
  cachedHighlight: string
}) => {
  const { addTask } = useTasksContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>(cachedViewState?.viewMode || 'grid');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(cachedViewState?.zoomLevel || 'year');
  const [focusedMonth, setFocusedMonth] = useState<number | null>(cachedViewState?.focusedMonth ?? null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(cachedViewState?.focusedDate ?? null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLevel>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel[]>([]);

  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  // Persist view state to localStorage
  useEffect(() => {
    const state = {
      zoomLevel,
      focusedMonth,
      focusedDate: focusedDate?.toISOString() || null,
      viewMode,
    };
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  }, [zoomLevel, focusedMonth, focusedDate, viewMode]);

  // Close sidebar when switching to mobile, but don't force open on desktop
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleMonthClick = useCallback((month: number) => {
    setFocusedMonth(month);
    setZoomLevel('month');
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setFocusedDate(date);
    setZoomLevel('day');
  }, []);

  const handleWeekClick = useCallback((date: Date) => {
    setFocusedDate(date);
    setZoomLevel('week');
  }, []);

  const handleZoomLevelChange = useCallback((level: ZoomLevel) => {
    setZoomLevel(level);
    if (level === 'year') {
      setFocusedMonth(null);
      setFocusedDate(null);
    } else if (level === 'month' && focusedMonth === null) {
      setFocusedMonth(new Date().getMonth());
    } else if ((level === 'week' || level === 'day') && focusedDate === null) {
      setFocusedDate(new Date());
    }
  }, [focusedMonth, focusedDate]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel === 'day') {
      setZoomLevel('week');
    } else if (zoomLevel === 'week') {
      setZoomLevel('month');
    } else if (zoomLevel === 'month') {
      setZoomLevel('year');
      setFocusedMonth(null);
    }
  }, [zoomLevel]);

  const handleJumpToToday = useCallback(() => {
    const today = new Date();
    setFocusedDate(today);
    setFocusedMonth(today.getMonth());
    setZoomLevel('day');
  }, []);

  const handleToggleEnergyFilter = useCallback((energy: EnergyLevel) => {
    setEnergyFilter(prev =>
      prev.includes(energy)
        ? prev.filter(e => e !== energy)
        : [...prev, energy]
    );
  }, []);

  const handleViewEnergyInbox = useCallback((energy: EnergyLevel) => {
    setEnergyFilter([energy]);
  }, []);

  const handleBrainDumpItems = useCallback(async (items: ParsedItem[]) => {
    if (!user) return;

    for (const item of items) {
      await addTask({
        title: item.text,
        energy_level: item.user_override_energy || item.detected_energy || 'medium',
        due_date: item.due_date,
        detected_from_brain_dump: true,
      });
    }
  }, [user, addTask]);

  const handleAddTrendTask = useCallback(async (title: string, energy: EnergyLevel) => {
    if (!user) return;
    await addTask({
      title,
      energy_level: energy,
    });
  }, [user, addTask]);

  const handleScheduleTask = useCallback(async (taskId: string, date: Date) => {
    // Handled in UnscheduledTasks and DndProvider
  }, []);

  const handleProfileClose = useCallback((open: boolean) => {
    setProfileOpen(open);
  }, []);

  const handleDefaultViewChange = useCallback((view: ZoomLevel) => {
    setZoomLevel(view);
    if (view === 'year') {
      setFocusedMonth(null);
      setFocusedDate(null);
    } else if (view === 'month') {
      setFocusedMonth(new Date().getMonth());
    } else if (view === 'week' || view === 'day') {
      setFocusedDate(new Date());
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <>
      <Header
        user={user as any}
        currentEnergy={currentEnergy}
        onEnergyChange={setCurrentEnergy}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onProfileClick={() => setProfileOpen(true)}
        avatarUrl={userProfile?.avatarUrl}
        highlightColor={userProfile.highlightColor || 'blue'}
        onAddTask={() => setQuickAddOpen(true)}
        onBrainDump={() => setBrainDumpOpen(true)}
        onLogoClick={() => {
          setZoomLevel('day');
          setFocusedDate(new Date());
          setFocusedMonth(new Date().getMonth());
        }}
      />
      <div className="flex-1 flex overflow-hidden w-full">
        <Sidebar
          open={sidebarOpen}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onBrainDumpClick={() => setBrainDumpOpen(true)}
          onTrendingClick={() => setTrendingOpen(true)}
          onFriendsClick={() => setFriendsOpen(true)}
          onJumpToToday={handleJumpToToday}
          memoryOpen={memoryOpen}
          onMemoryClick={() => setMemoryOpen(!memoryOpen)}
          onClose={handleCloseSidebar}
          selectedEnergies={energyFilter}
          onToggleEnergy={handleToggleEnergyFilter}
          onClearEnergies={() => setEnergyFilter([])}
        />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
            <HeroWidgets
              onBrainDumpClick={() => setBrainDumpOpen(true)}
              onTrendingClick={() => setTrendingOpen(true)}
            />

            <UnscheduledTasks
              energyFilter={energyFilter}
              onScheduleTask={handleScheduleTask}
            />
          </div>

          <div className="flex-1 overflow-auto p-2 sm:p-4 lg:p-6">
            <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
              <PlannerView
                viewMode={viewMode}
                zoomLevel={zoomLevel}
                focusedMonth={focusedMonth}
                focusedDate={focusedDate}
                currentEnergy={currentEnergy}
                energyFilter={energyFilter}
                onMonthClick={handleMonthClick}
                onDayClick={handleDayClick}
                onWeekClick={handleWeekClick}
                onZoomOut={handleZoomOut}
                onZoomLevelChange={handleZoomLevelChange}
                onJumpToToday={handleJumpToToday}
                onSetFocusedDate={setFocusedDate}
                onSetFocusedMonth={setFocusedMonth}
              />
            </div>
          </div>
        </main>

        {user && !isMobile && (
          <MemoryPanel
            userId={user.id}
            isOpen={memoryOpen}
            onClose={() => setMemoryOpen(false)}
          />
        )}
      </div>

      <Suspense fallback={null}>
        {brainDumpOpen && (
          <BrainDumpModal
            open={brainDumpOpen}
            onOpenChange={setBrainDumpOpen}
            onItemsAdded={handleBrainDumpItems}
          />
        )}

        {profileOpen && (
          <ProfileModal
            open={profileOpen}
            onOpenChange={handleProfileClose}
            userId={user.id}
            onDefaultViewChange={handleDefaultViewChange}
          />
        )}

        {trendingOpen && (
          <TrendingTopicsModal
            open={trendingOpen}
            onOpenChange={setTrendingOpen}
            userProfile={userProfile}
            onAddTask={handleAddTrendTask}
          />
        )}

        {friendsOpen && (
          <FriendsModal
            open={friendsOpen}
            onOpenChange={setFriendsOpen}
            userId={user.id}
          />
        )}

        {quickAddOpen && (
          <QuickAddTaskDialog
            open={quickAddOpen}
            onOpenChange={setQuickAddOpen}
            userId={user.id}
            defaultEnergy={currentEnergy}
          />
        )}
      </Suspense>
    </>
  );
};

export default Index;
