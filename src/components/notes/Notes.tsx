'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNoteStore } from '@/lib/stores/noteStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NoteEditor } from './NoteEditor';
import {
  Plus,
  Search,
  Pin,
  Clock,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title?: string;
  content: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function Notes() {
  const noteStore = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs for callbacks
  const handleCreateNoteRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Get notes array and sort
  const notes = Array.from(noteStore.notes.values());
  const sortedNotes = notes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Selected note
  const selectedNote = selectedNoteId ? noteStore.notes.get(selectedNoteId) : null;

  // Define callbacks
  const handleCreateNote = useCallback(async () => {
    try {
      const note: Note = await noteStore.createNote({
        title: '',
        content: '',
      });
      if (note?.id) {
        setSelectedNoteId(note.id);
        if (isMobileView) setShowSidebar(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }, [isMobileView, noteStore]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (confirm('Delete this note?')) {
      await noteStore.deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    }
  }, [selectedNoteId, noteStore]);

  const handleTogglePin = useCallback(async (noteId: string) => {
    const note = noteStore.notes.get(noteId);
    if (note) {
      await noteStore.updateNoteData(noteId, { isPinned: !note.isPinned });
    }
  }, [noteStore]);

  const handleArchiveNote = useCallback(async (noteId: string) => {
    await noteStore.updateNoteData(noteId, { isArchived: true });
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, noteStore]);

  const handleSaveNote = useCallback(async (id: string, data: { title?: string; content: string }) => {
    await noteStore.updateNoteData(id, data);
  }, [noteStore]);

  // Update ref
  useEffect(() => {
    handleCreateNoteRef.current = handleCreateNote;
  }, [handleCreateNote]);

  // Fetch notes on mount
  useEffect(() => {
    noteStore.fetchNotes({ isArchived: false });
  }, []);

  // Handle search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery) {
        noteStore.fetchNotes({ isArchived: false, search: searchQuery });
      } else {
        noteStore.fetchNotes({ isArchived: false });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNoteRef.current?.();
      }
      if (e.key === 'Escape' && isMobileView && !showSidebar) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileView, showSidebar]);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      if (!isMobile) setShowSidebar(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (isMobileView) setShowSidebar(false);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const getNotePreview = (content: string) => {
    const trimmed = content.replace(/\n/g, ' ').slice(0, 40) || 'No additional text';
    return content.length > 40 ? trimmed + '...' : trimmed;
  };

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar - Note List */}
      <div
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200',
          isMobileView
            ? showSidebar
              ? 'w-full'
              : 'w-0 overflow-hidden'
            : 'w-64 lg:w-72'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Notes</h2>
            <Button
              size="sm"
              onClick={handleCreateNote}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Note List */}
        <ScrollArea className="flex-1 h-0 min-h-0 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No notes found' : 'No notes yet. Create one!'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteSelect(note.id)}
                  className={cn(
                    'group p-4 cursor-pointer transition-colors hover:bg-accent/50',
                    selectedNoteId === note.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {note.title || 'Untitled Note'}
                        </h3>
                        {note.isPinned && (
                          <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getNotePreview(note.content)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id);
                        }}
                      >
                        <Pin
                          className={cn(
                            'h-3.5 w-3.5',
                            note.isPinned
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Editor Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-200',
          isMobileView && showSidebar && 'hidden'
        )}
      >
        {selectedNote ? (
          <NoteEditor
            note={{
              id: selectedNote.id,
              title: selectedNote.title,
              content: selectedNote.content,
            }}
            isMobileView={isMobileView}
            onBack={() => setShowSidebar(true)}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onArchive={handleArchiveNote}
          />
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Select a note to view</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Choose a note from the list on the left, or create a new one to get started.
            </p>
            <Button onClick={handleCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Note
            </Button>
            <div className="mt-8 text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded">⌘N</span> to create ·
              <span className="px-2 py-1 bg-muted rounded ml-1">⌘S</span> to save
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
