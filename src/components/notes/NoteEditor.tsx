'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trash2, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface NoteEditorProps {
  note: {
    id: string;
    title?: string;
    content: string;
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

  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(note.id, {
        title: title.trim() || undefined,
        content: content.trim(),
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

  const handleBlur = () => {
    if (isDirty) {
      handleSave();
    }
  };

  return (
    <>
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {isSaving
              ? 'Saving...'
              : isDirty
              ? 'Unsaved changes'
              : lastSaved
              ? `Saved ${format(lastSaved, 'h:mm a')}`
              : 'All changes saved'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onArchive(note.id)}
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(note.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto p-6 md:p-10">
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="w-full text-3xl md:text-4xl font-bold placeholder:text-muted-foreground/50 bg-transparent border-none outline-none mb-6"
          />
          <textarea
            placeholder="Start writing..."
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="w-full h-[calc(100vh-280px)] resize-none text-base md:text-lg leading-relaxed placeholder:text-muted-foreground/50 bg-transparent border-none outline-none"
            autoFocus
          />
        </div>
      </div>
    </>
  );
}
