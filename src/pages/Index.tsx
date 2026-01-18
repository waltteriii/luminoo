import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLevel>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel[]>([]);
  
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  // Set sidebar default based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
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
      const profile = {
        creatorType: data.creator_type,
        platforms: (data.platforms || []) as Platform[],
        nicheKeywords: data.niche_keywords || [],
        audienceDescription: data.audience_description,
        avatarUrl: data.avatar_url,
        defaultView: ((data as any).default_view as ZoomLevel) || null,
        highlightColor: ((data as any).highlight_color as string) || 'blue'
      };
      setUserProfile(profile);
      
      // Apply highlight color
      if (profile.highlightColor) {
        document.documentElement.setAttribute('data-highlight', profile.highlightColor);
      }
      
      // Set the default view if configured
      if (profile.defaultView) {
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
          onAddTask={() => setQuickAddOpen(true)}
          onBrainDump={() => setBrainDumpOpen(true)}
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
            {/* Unscheduled tasks inbox */}
            <UnscheduledTasks 
              energyFilter={energyFilter}
              onScheduleTask={handleScheduleTask}
            />
            
            {/* Main planner view */}
            <div className="flex-1 overflow-auto p-2 sm:p-4">
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
  );
};

export default Index;
