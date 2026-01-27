import { memo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WindowId, getAllWindows } from './windowRegistry';
import { useWindowStateContext } from './useWindowState';
import { useWorkspace } from './WorkspaceContext';
import WorkspacesDialog from './WorkspacesDialog';

function WindowsDropdown() {
  const { visibleWindows, toggleWindow } = useWindowStateContext();
  const windows = getAllWindows();
  const { locked, setLocked, restoreLastGood, hasLastGood, templates, applyTemplate } = useWorkspace();
  const [workspacesOpen, setWorkspacesOpen] = useState(false);

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

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Templates</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {templates.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={(e) => e.preventDefault()}
                onClick={() => applyTemplate(t.id)}
              >
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuCheckboxItem
          checked={locked}
          onCheckedChange={(v) => setLocked(!!v)}
          onSelect={(e) => e.preventDefault()}
        >
          Lock layout
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem
          disabled={!hasLastGood}
          onSelect={(e) => e.preventDefault()}
          onClick={() => restoreLastGood()}
        >
          Restore last good
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setWorkspacesOpen(true)}>
          Manage workspaces…
        </DropdownMenuItem>
      </DropdownMenuContent>

      <WorkspacesDialog open={workspacesOpen} onOpenChange={setWorkspacesOpen} />
    </DropdownMenu>
  );
}

export default memo(WindowsDropdown);

