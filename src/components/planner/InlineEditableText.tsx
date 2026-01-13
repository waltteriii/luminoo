import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface InlineEditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineEditableText({
  value,
  onSave,
  className,
  placeholder = "Click to edit...",
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() !== value.trim()) {
      onSave(editValue.trim());
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <div className="relative inline-block w-full">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            "w-full bg-background/80 backdrop-blur-sm",
            "border border-border/50 rounded px-2 py-0.5",
            "focus:outline-none focus:ring-1 focus:ring-ring/50",
            "transition-all duration-200",
            className
          )}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-1.5 group">
      <span
        onDoubleClick={handleDoubleClick}
        className={cn(
          "cursor-text transition-all duration-200",
          "hover:bg-foreground/5 rounded px-1 -mx-1",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
          className
        )}
        tabIndex={0}
        role="button"
        aria-label="Double click to edit"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
      >
        {value || placeholder}
      </span>
      {showSaved && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-foreground animate-fade-in">
          <Check className="w-2.5 h-2.5" />
          Saved
        </span>
      )}
    </div>
  );
}
