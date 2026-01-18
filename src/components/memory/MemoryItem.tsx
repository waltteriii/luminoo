import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';
import { GripVertical, Check, X, Trash2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import EnergyPill from '@/components/shared/EnergyPill';

interface MemoryItemProps {
  item: Task;
  onTitleChange: (id: string, title: string) => void;
  onEnergyChange: (id: string, energy: EnergyLevel) => void;
  onDelete: (id: string) => void;
  onMoveToInbox: (id: string) => void;
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: 'High Focus' },
  { value: 'medium', label: 'Steady' },
  { value: 'low', label: 'Low Energy' },
  { value: 'recovery', label: 'Recovery' },
];

const MemoryItem = ({ item, onTitleChange, onEnergyChange, onDelete, onMoveToInbox }: MemoryItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [clickPosition, setClickPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `memory-${item.id}`,
    data: { task: item, type: 'memory-item' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (clickPosition !== null) {
        inputRef.current.setSelectionRange(clickPosition, clickPosition);
        setClickPosition(null);
      }
    }
  }, [isEditing, clickPosition]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    
    const target = e.currentTarget;
    const text = item.title;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const charWidth = rect.width / text.length;
    const approxPosition = Math.round(clickX / charWidth);
    const clampedPosition = Math.max(0, Math.min(text.length, approxPosition));
    
    setEditTitle(item.title);
    setClickPosition(clampedPosition);
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      onTitleChange(item.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(item.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-2 p-2 rounded bg-card border border-border transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-70 shadow-lg ring-2 ring-highlight"
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              className="flex-1 bg-transparent border-none outline-none text-xs text-foreground focus:ring-0 focus:outline-none p-0 selection:bg-highlight/30"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveTitle();
              }}
            >
              <Check className="w-3 h-3 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
            >
              <X className="w-3 h-3 text-foreground-muted" />
            </Button>
          </div>
        ) : (
          <span
            className="text-xs truncate cursor-text flex-1"
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit"
          >
            {item.title}
          </span>
        )}

        {!isEditing && (
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="cursor-pointer hover:opacity-80">
                <EnergyPill energy={item.energy_level} size="sm" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnergyChange(item.id, option.value);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-secondary transition-colors",
                    item.energy_level === option.value && "bg-secondary"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      option.value === 'high' && "bg-energy-high",
                      option.value === 'medium' && "bg-energy-medium",
                      option.value === 'low' && "bg-energy-low",
                      option.value === 'recovery' && "bg-energy-recovery"
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Actions - visible on hover */}
      {!isEditing && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-foreground-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToInbox(item.id);
            }}
            title="Move to inbox"
          >
            <Inbox className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 ml-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MemoryItem;
