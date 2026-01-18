import { memo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Menu, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon,
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { EnergyLevel } from '@/types';
import EnergySelector from '@/components/planner/NewEnergySelector';
import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  user: User;
  currentEnergy: EnergyLevel;
  onEnergyChange: (energy: EnergyLevel) => void;
  onToggleSidebar: () => void;
  onProfileClick: () => void;
  onFilterEnergy?: (energy: EnergyLevel) => void;
  onClearFilters?: () => void;
  onViewInbox?: (energy: EnergyLevel) => void;
  activeFilters?: EnergyLevel[];
  avatarUrl?: string | null;
  onAddTask?: () => void;
  onBrainDump?: () => void;
}

const Header = memo(({ 
  user, 
  currentEnergy, 
  onEnergyChange, 
  onToggleSidebar, 
  onProfileClick,
  onFilterEnergy,
  onClearFilters,
  onViewInbox,
  activeFilters = [],
  avatarUrl,
  onAddTask,
  onBrainDump
}: HeaderProps) => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isMobile = useIsMobile();

  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const displayName = user.email?.split('@')[0] || 'User';

  return (
    <header className="h-12 lg:h-14 border-b border-border bg-background-elevated flex items-center justify-between px-2 sm:px-4 lg:px-6 gap-2">
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar}
          className="text-foreground-muted hover:text-foreground min-w-[40px] min-h-[40px] lg:min-w-[44px] lg:min-h-[44px]"
        >
          <Menu className="w-4 h-4 lg:w-5 lg:h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary-foreground" />
          </div>
          <span className="font-medium text-foreground text-sm lg:text-base hidden md:block">Luminoo</span>
        </div>
      </div>

      {/* Center section - Energy selector */}
      <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
        <EnergySelector 
          value={currentEnergy} 
          onChange={onEnergyChange}
          onFilterClick={onFilterEnergy}
          activeFilters={activeFilters}
          onShowAll={onClearFilters}
          onViewInbox={onViewInbox}
          onAddTask={onAddTask}
          onBrainDump={onBrainDump}
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-foreground-muted hover:text-foreground min-w-[40px] min-h-[40px] lg:min-w-[44px] lg:min-h-[44px]"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          ) : (
            <Moon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-1 sm:gap-2 text-foreground-muted hover:text-foreground min-h-[40px] lg:min-h-[44px] px-1.5 lg:px-2"
            >
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-foreground-muted" />
                )}
              </div>
              {!isMobile && (
                <>
                  <span className="text-xs lg:text-sm max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onProfileClick} className="text-foreground-muted cursor-pointer min-h-[40px]">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive min-h-[40px]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
