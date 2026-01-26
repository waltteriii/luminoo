import { memo, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import { User } from '@supabase/supabase-js';
// import { supabase } from '@/integrations/supabase/client';
import { Squirrel, Menu, LogOut, User as UserIcon, ChevronDown, Moon, Sun } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  user: any;
  currentEnergy: EnergyLevel;
  onEnergyChange: (energy: EnergyLevel) => void;
  onToggleSidebar: () => void;
  onProfileClick: () => void;
  avatarUrl?: string | null;
  highlightColor?: string;
  onAddTask?: () => void;
  onBrainDump?: () => void;
  onLogoClick?: () => void;
}

const Header = memo(({
  user,
  currentEnergy,
  onEnergyChange,
  onToggleSidebar,
  onProfileClick,
  avatarUrl,
  highlightColor = 'blue',
  onAddTask,
  onBrainDump,
  onLogoClick
}: HeaderProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSignOut = useCallback(async () => {
    toast({ title: "Signed out (local mode)" });
    // In a real app we'd redirect or clear state
    window.location.reload();
  }, [toast]);

  const displayName = user.email?.split('@')[0] || 'User';

  return (
    <header className={cn(
      "border-b border-border bg-background-elevated flex items-center justify-between",
      "h-14 px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3"
    )}>
      {/* Left section - hamburger + logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSidebar();
          }}
          className="h-11 w-11 min-h-[44px] min-w-[44px] text-foreground-muted hover:text-foreground touch-manipulation"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Logo - hidden on mobile for space */}
        {!isMobile && (
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity touch-manipulation"
          >
            <div
              className={cn(
                "group w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
                highlightColor === 'blue' && "bg-blue-500",
                highlightColor === 'purple' && "bg-purple-500",
                highlightColor === 'green' && "bg-emerald-500",
                highlightColor === 'orange' && "bg-orange-500",
                highlightColor === 'pink' && "bg-pink-500",
                highlightColor === 'cyan' && "bg-cyan-500",
                highlightColor === 'teal' && "bg-teal-500",
                !['blue', 'purple', 'green', 'orange', 'pink', 'cyan', 'teal'].includes(highlightColor) && "bg-primary"
              )}
            >
              <Squirrel className="w-4 h-4 text-white group-hover:animate-squirrel-hello" />
            </div>
            <span className="font-medium text-foreground text-sm hidden lg:block">Luminoo</span>
          </button>
        )}
      </div>

      {/* Right section - theme toggle + avatar */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-foreground-muted hover:text-foreground h-11 px-2 min-h-[44px] touch-manipulation"
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-foreground-muted" />
                )}
              </div>
              {!isMobile && (
                <>
                  <span className="text-sm max-w-[80px] truncate hidden sm:inline">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onProfileClick} className="text-foreground-muted cursor-pointer min-h-[44px] touch-manipulation">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive min-h-[44px] touch-manipulation"
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

// Theme Toggle Component
const THEME_KEY = 'luminoo-theme';

const ThemeToggle = memo(() => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to dark
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-11 w-11 min-h-[44px] min-w-[44px] text-foreground-muted hover:text-foreground touch-manipulation"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

Header.displayName = 'Header';

export default Header;
