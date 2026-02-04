'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trash2, Archive, SquarePen } from 'lucide-react';
import { format } from 'date-fns';

interface NoteEditorProps {
  note: {
    id: string;
    title?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
  isMobileView: boolean;
  onBack: () => void;
  onSave: (id: string, data: { title?: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

export function NoteEditor({
  note,
  isMobileView,
  onBack,
  onSave,
  onDelete,
  onArchive,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(note.title || '');
    setContent(note.content);
    setIsDirty(false);
  }, [note.id, note.title, note.content]);

  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(note.id, {
        title: title.trim() || undefined,
        content,
      });
      setIsDirty(false);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [note.id, title, content, isDirty, isSaving, onSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const handleBlur = useCallback(() => {
    if (isDirty) {
      handleSave();
    }
  }, [isDirty, handleSave]);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-background to-muted/10 h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <SquarePen className="h-4 w-4 text-primary/60" />
            <span className={`
              text-xs font-medium transition-colors
              ${isSaving ? 'text-amber-500' : isDirty ? 'text-amber-500' : 'text-muted-foreground'}
            `}>
              {isSaving
                ? 'Saving...'
                : isDirty
                ? 'Unsaved changes'
                : lastSaved
                ? `Saved ${format(lastSaved, 'h:mm a')}`
                : 'All changes saved'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            onClick={() => onArchive(note.id)}
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => onDelete(note.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto p-6 md:p-10 max-w-4xl">
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full text-2xl md:text-4xl font-bold placeholder:text-muted-foreground/40 bg-transparent border-none outline-none mb-6 text-foreground"
          />
          <textarea
            placeholder="Start writing your note..."
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-[calc(100vh-280px)] resize-none text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/40 bg-transparent border-none outline-none text-foreground/90"
            autoFocus
          />
          <div className="text-xs text-muted-foreground/50 pt-4 border-t mt-6 flex items-center gap-2">
            <span>Created:</span>
            <span>{format(new Date(note.createdAt), 'MMMM d, yyyy h:mm a')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
