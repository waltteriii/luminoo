import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface WindowFrameProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function isInteractive(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  return !!el.closest(
    'button,a,input,textarea,select,[role="button"],[contenteditable="true"],[data-task-draggable],[data-task-handle],[data-dnd-item],[data-window-no-drag]'
  );
}

export default function WindowFrame({ title, children, actions, className }: WindowFrameProps) {
  return (
    <div
      className={cn(
        'flex flex-col border border-border rounded-lg bg-card overflow-hidden h-full min-w-0 min-h-0',
        className
      )}
    >
      <div
        className="window-header window-titlebar flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30 select-none"
        onPointerDownCapture={(e) => {
          if (isInteractive(e.target)) e.stopPropagation();
        }}
        onMouseDownCapture={(e) => {
          if (isInteractive(e.target)) e.stopPropagation();
        }}
      >
        <div className="window-titlebar-bg flex items-center gap-2 min-w-0 flex-1">
          <div
            className="window-drag-handle flex items-center justify-center w-7 h-7 rounded-md hover:bg-secondary/60 cursor-grab active:cursor-grabbing"
            data-window-drag-handle
            aria-label="Move window"
          >
            <GripVertical className="w-4 h-4 text-foreground-muted" />
          </div>
          <h3 className="text-sm font-semibold truncate">{title}</h3>
        </div>
        {actions && (
          <div className="flex items-center gap-1" data-window-no-drag>
            {actions}
          </div>
        )}
      </div>
      <div className="window-content flex-1 p-4 overflow-auto min-w-0 min-h-0">{children}</div>
    </div>
  );
}

