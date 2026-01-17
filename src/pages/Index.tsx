import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PlannerView from '@/components/planner/PlannerView';
import { ViewMode, ZoomLevel, EnergyLevel } from '@/types';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLevel>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleZoomOut = () => {
    if (zoomLevel === 'month') {
      setZoomLevel('quarter');
    } else if (zoomLevel === 'quarter') {
      setZoomLevel('year');
      setFocusedMonth(null);
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
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          open={sidebarOpen}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
        />
        <main className="flex-1 overflow-auto">
          <PlannerView
            viewMode={viewMode}
            zoomLevel={zoomLevel}
            focusedMonth={focusedMonth}
            currentEnergy={currentEnergy}
            onMonthClick={handleMonthClick}
            onZoomOut={handleZoomOut}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
