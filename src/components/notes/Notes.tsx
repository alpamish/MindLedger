'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Archive,
  Trash2,
  SquarePen,
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
  const [noteFilter, setNoteFilter] = useState<'active' | 'archived'>('active');

  const handleCreateNoteRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const notes = Array.from(noteStore.notes.values());
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes]);

  const selectedNote = selectedNoteId ? noteStore.notes.get(selectedNoteId) : null;

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

  useEffect(() => {
    handleCreateNoteRef.current = handleCreateNote;
  }, [handleCreateNote]);

  useEffect(() => {
    noteStore.fetchNotes({ isArchived: noteFilter === 'archived' });
  }, [noteFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      noteStore.fetchNotes({ 
        isArchived: noteFilter === 'archived',
        search: searchQuery || undefined 
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, noteFilter, noteStore]);

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
    return format(d, 'MMM d, yyyy');
  };

  const formatCreatedDate = (date: string) => {
    const d = new Date(date);
    return format(d, 'MMM d, yyyy');
  };

  const getNotePreview = (content: string) => {
    const trimmed = content.replace(/\n/g, ' ').slice(0, 60) || 'No additional text';
    return content.length > 60 ? trimmed + '...' : trimmed;
  };

  const getNoteTitle = (content: string, title?: string) => {
    if (title?.trim()) return title;
    const firstLine = content.split('\n')[0].slice(0, 30);
    return firstLine || 'Untitled Note';
  };

  return (
    <div className="h-[90vh] flex bg-gradient-to-br from-background to-muted/20">
      {/* Sidebar - Note List */}
      <div
        className={cn(
          'flex flex-col bg-card/80 backdrop-blur-sm border-r shadow-sm transition-all duration-300 h-screen sticky top-0',
          isMobileView
            ? showSidebar
              ? 'w-full absolute inset-0 z-10'
              : 'w-0 overflow-hidden'
            : 'w-72 lg:w-80'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-card/95 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10 hidden md:flex md:flex-col lg:block">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Notes</h2>
            <Button
              onClick={handleCreateNote}
              size="sm"
              className="shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-3">
            <button
              onClick={() => setNoteFilter('active')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                noteFilter === 'active'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setNoteFilter('archived')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                noteFilter === 'archived'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Archived
            </button>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Note List */}
        <ScrollArea className="flex-1 min-h-0">
          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <p className="text-muted-foreground text-sm">
                {searchQuery 
                  ? 'No notes found' 
                  : noteFilter === 'archived' 
                    ? 'No archived notes' 
                    : 'No notes yet. Create one!'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteSelect(note.id)}
                  className={cn(
                    'p-4 cursor-pointer transition-colors hover:bg-accent/50',
                    selectedNoteId === note.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {note.isPinned && (
                          <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        )}
                        <h3 className="font-medium text-sm truncate">
                          {getNoteTitle(note.content, note.title)}
                        </h3>
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id);
                        }}
                      >
                        <Pin className={cn('h-3.5 w-3.5', note.isPinned ? 'text-amber-500' : 'text-muted-foreground')} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t bg-card/95 backdrop-blur-sm flex-shrink-0">
          {/* Mobile Filter Tabs - only visible on mobile */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-3 md:hidden">
            <button
              onClick={() => setNoteFilter('active')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                noteFilter === 'active'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setNoteFilter('archived')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                noteFilter === 'archived'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Archived
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground text-center sm:text-left">
              {noteFilter === 'archived' 
                ? sortedNotes.length > 0 
                  ? `${sortedNotes.length} archived`
                  : 'No archived'
                : `${sortedNotes.length} note${sortedNotes.length !== 1 ? 's' : ''}`
              }
            </span>
            <Button
              onClick={handleCreateNote}
              size="sm"
              className="w-full sm:w-auto shadow-sm md:hidden"
              disabled={noteFilter === 'archived'}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          isMobileView && showSidebar && 'hidden'
        )}
      >
        {selectedNote ? (
          <NoteEditor
            note={{
              id: selectedNote.id,
              title: selectedNote.title,
              content: selectedNote.content,
              createdAt: selectedNote.createdAt,
              updatedAt: selectedNote.updatedAt,
            }}
            isMobileView={isMobileView}
            onBack={() => setShowSidebar(true)}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onArchive={handleArchiveNote}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <SquarePen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Select a note to view</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a note from the list or create a new one.
            </p>
            <Button onClick={handleCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
