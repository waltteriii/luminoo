import { memo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WindowId, getAllWindows } from './windowRegistry';
import { useWindowStateContext } from './useWindowState';

function WindowsDropdown() {
  const { visibleWindows, toggleWindow } = useWindowStateContext();
  const windows = getAllWindows();

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="windows-dropdown-trigger"
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] text-foreground-muted hover:text-foreground touch-manipulation"
                aria-label="Windows"
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Windows</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-52">
        {windows.map((w) => {
          const checked = visibleWindows.includes(w.id);
          const isLastVisible = checked && visibleWindows.length === 1;
          return (
            <DropdownMenuCheckboxItem
              key={w.id}
              checked={checked}
              disabled={isLastVisible}
              onCheckedChange={() => !isLastVisible && toggleWindow(w.id as WindowId)}
              onSelect={(e) => e.preventDefault()}
            >
              {w.title}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(WindowsDropdown);

