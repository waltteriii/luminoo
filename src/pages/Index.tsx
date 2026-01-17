import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PlannerView from '@/components/planner/PlannerView';
import BrainDumpModal from '@/components/brain-dump/BrainDumpModal';
import ProfileModal from '@/components/profile/ProfileModal';
import { ViewMode, ZoomLevel, EnergyLevel, ParsedItem } from '@/types';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('circular');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLevel>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleMonthClick = (month: number) => {
    setFocusedMonth(month);
    setZoomLevel('month');
  };

  const handleDayClick = (date: Date) => {
    setFocusedDate(date);
    setZoomLevel('day');
  };

  const handleWeekClick = (date: Date) => {
    setFocusedDate(date);
    setZoomLevel('week');
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'day') {
      setZoomLevel('week');
    } else if (zoomLevel === 'week') {
      setZoomLevel('month');
    } else if (zoomLevel === 'month') {
      setZoomLevel('year');
      setFocusedMonth(null);
    }
  };

  const handleBrainDumpItems = async (items: ParsedItem[]) => {
    if (!user) return;
    
    for (const item of items) {
      if (item.type === 'task') {
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: item.text,
          energy_level: item.user_override_energy || item.detected_energy,
          urgency: item.urgency,
          emotional_note: item.emotional_note,
          suggested_timeframe: item.suggested_timeframe,
          detected_from_brain_dump: true,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        user={user}
        currentEnergy={currentEnergy}
        onEnergyChange={setCurrentEnergy}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          open={sidebarOpen}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
          onBrainDumpClick={() => setBrainDumpOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <PlannerView
            viewMode={viewMode}
            zoomLevel={zoomLevel}
            focusedMonth={focusedMonth}
            focusedDate={focusedDate}
            currentEnergy={currentEnergy}
            onMonthClick={handleMonthClick}
            onDayClick={handleDayClick}
            onWeekClick={handleWeekClick}
            onZoomOut={handleZoomOut}
          />
        </main>
      </div>

      <BrainDumpModal
        open={brainDumpOpen}
        onOpenChange={setBrainDumpOpen}
        onItemsAdded={handleBrainDumpItems}
      />

      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userId={user.id}
      />
    </div>
  );
};

export default Index;
