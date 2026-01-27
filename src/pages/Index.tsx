import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, type User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DndProvider from '@/components/dnd/DndProvider';
import MemoryPanel from '@/components/memory/MemoryPanel';
import { TasksProvider, useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';
import WindowLayout from '@/windows/WindowLayout';
import InboxPane from '@/windows/InboxPane';
import CalendarPane from '@/windows/CalendarPane';
import UnfoldPane from '@/windows/UnfoldPane';
import { WindowStateProvider, useWindowStateContext } from '@/windows/useWindowState';

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

type CachedViewState = {
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  focusedDate: Date | null;
  viewMode: ViewMode;
};

// Load cached view state from localStorage
const loadCachedViewState = (): CachedViewState | null => {
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
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate('/auth');
      }
    });

    // Listener for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate('/auth');
      }
    });

    // Safety timeout in case Supabase hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!session || !user) {
    // If not loading and no user, we should have redirected. 
    // Showing a fallback ensuring we don't render black screen.
    return (
      <div className="flex items-center justify-center min-h-screen text-foreground-muted">
        Redirecting to login...
      </div>
    );
  }

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
  user: User,
  session: Session,
  userProfile: UserProfile,
  setUserProfile: Dispatch<SetStateAction<UserProfile>>,
  cachedViewState: CachedViewState | null,
  cachedHighlight: string
}) => {
  const { addTask, refreshTasks } = useTasksContext();
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

  // Pane area: uses WindowStateProvider as the single source of truth.
  const WindowedPaneArea = () => {
    const { visibleWindows } = useWindowStateContext();

    return (
      <div className="flex-1 overflow-hidden p-2 sm:p-4 lg:p-6 min-h-0">
        <div className="w-full h-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
          <WindowLayout visibleWindows={visibleWindows}>
            {(windowId) => {
              switch (windowId) {
                case 'inbox':
                  return <InboxPane energyFilter={energyFilter} onScheduleTask={handleScheduleTask} />;
                case 'calendar':
                  return (
                    <CalendarPane
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
                  );
                case 'unfold':
                  return <UnfoldPane />;
                default:
                  return null;
              }
            }}
          </WindowLayout>
        </div>
      </div>
    );
  };

  return (
    <DndProvider onTaskScheduled={refreshTasks}>
      <WindowStateProvider>
        <Header
          user={user}
          currentEnergy={currentEnergy}
          onEnergyChange={setCurrentEnergy}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onProfileClick={() => setProfileOpen(true)}
          avatarUrl={userProfile?.avatarUrl}
          highlightColor={userProfile.highlightColor || 'blue'}
          onAddTask={() => setQuickAddOpen(true)}
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
          <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
            <WindowedPaneArea />
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
              userEmail={user.email}
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
      </WindowStateProvider>
    </DndProvider>
  );
};

export default Index;
