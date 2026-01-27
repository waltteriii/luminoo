import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WindowFrameProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function WindowFrame({ title, children, actions, className }: WindowFrameProps) {
  return (
    <div className={cn('flex flex-col border border-border rounded-lg bg-card overflow-hidden h-full min-h-0', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold truncate">{title}</h3>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className="flex-1 overflow-auto min-h-0">{children}</div>
    </div>
  );
}

