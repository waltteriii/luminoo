import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PlannerView from '@/components/planner/PlannerView';
import UnscheduledTasks from '@/components/planner/UnscheduledTasks';
import DndProvider from '@/components/dnd/DndProvider';
import MemoryPanel from '@/components/memory/MemoryPanel';
import { TasksProvider } from '@/contexts/TasksContext';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    creatorType: null,
    platforms: [],
    nicheKeywords: [],
    audienceDescription: null,
    avatarUrl: null,
    defaultView: null,
    highlightColor: cachedHighlight,
  });
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
  // (allows user's toggle state to persist on desktop)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('creator_type, platforms, niche_keywords, audience_description, avatar_url, default_view, highlight_color')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const highlightColor = ((data as any).highlight_color as string) || 'blue';
      
      const profile = {
        creatorType: data.creator_type,
        platforms: (data.platforms || []) as Platform[],
        nicheKeywords: data.niche_keywords || [],
        audienceDescription: data.audience_description,
        avatarUrl: data.avatar_url,
        defaultView: ((data as any).default_view as ZoomLevel) || null,
        highlightColor,
      };
      setUserProfile(profile);
      
      // Cache and apply highlight color
      localStorage.setItem(HIGHLIGHT_KEY, highlightColor);
      document.documentElement.setAttribute('data-highlight', highlightColor);
      
      // Only set view from profile if no cached view state exists
      if (!cachedViewState && profile.defaultView) {
        setZoomLevel(profile.defaultView);
        if (profile.defaultView === 'month') {
          setFocusedMonth(new Date().getMonth());
        } else if (profile.defaultView === 'week' || profile.defaultView === 'day') {
          setFocusedDate(new Date());
        }
      }
    }
  }, []);

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
      if (item.type === 'task') {
        const dueDate = (item as any).due_date || null;
        
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: item.text,
          energy_level: item.user_override_energy || item.detected_energy,
          urgency: item.urgency,
          emotional_note: item.emotional_note,
          suggested_timeframe: item.suggested_timeframe,
          due_date: dueDate,
          detected_from_brain_dump: true,
        });
      }
    }
  }, [user]);

  const handleAddTrendTask = useCallback(async (title: string, energy: EnergyLevel) => {
    if (!user) return;
    
    await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      energy_level: energy,
      detected_from_brain_dump: false,
    });
  }, [user]);

  const handleScheduleTask = useCallback(async (taskId: string, date: Date) => {
    // Handled in UnscheduledTasks and DndProvider
  }, []);

  const handleProfileClose = useCallback((open: boolean) => {
    setProfileOpen(open);
    if (!open && user) {
      loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TasksProvider userId={user.id}>
      <DndProvider>
        <div className="min-h-screen bg-background flex flex-col w-full">
        <Header 
          user={user}
          currentEnergy={currentEnergy}
          onEnergyChange={setCurrentEnergy}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onProfileClick={() => setProfileOpen(true)}
          onFilterEnergy={handleToggleEnergyFilter}
          onClearFilters={() => setEnergyFilter([])}
          onViewInbox={handleViewEnergyInbox}
          activeFilters={energyFilter}
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
          />
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Centered content container for large screens */}
            <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
              {/* Unscheduled tasks inbox */}
              <UnscheduledTasks 
                energyFilter={energyFilter}
                onScheduleTask={handleScheduleTask}
              />
            </div>
            
            {/* Main planner view */}
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
                />
              </div>
            </div>
          </main>
          
          {/* Memory Panel - right side (hidden on mobile) */}
          {user && !isMobile && (
            <MemoryPanel
              userId={user.id}
              isOpen={memoryOpen}
              onClose={() => setMemoryOpen(false)}
            />
          )}
        </div>

        {/* Lazy loaded modals */}
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
        </div>
      </DndProvider>
    </TasksProvider>
  );
};

export default Index;
