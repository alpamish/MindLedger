import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NoteState {
  notes: Map<string, any>;
  isLoading: boolean;
  error: string | null;

  setNotes: (notes: any[]) => void;
  addNote: (note: any) => void;
  updateNote: (id: string, updates: Partial<any>) => void;
  removeNote: (id: string) => void;

  fetchNotes: (filters?: { isPinned?: boolean; isArchived?: boolean; search?: string }) => Promise<void>;
  createNote: (data: { title?: string; content: string; color?: string; isPinned?: boolean }) => Promise<any>;
  updateNoteData: (id: string, data: any) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  getNoteById: (id: string) => any | undefined;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: new Map(),
      isLoading: false,
      error: null,

      setNotes: (notes) => {
        const noteMap = new Map();
        notes.forEach((note) => noteMap.set(note.id, note));
        set({ notes: noteMap, error: null });
      },

      addNote: (note) => {
        set((state) => {
          const newNotes = new Map(state.notes);
          newNotes.set(note.id, note);
          return { notes: newNotes };
        });
      },

      updateNote: (id, updates) => {
        set((state) => {
          const newNotes = new Map(state.notes);
          const existingNote = newNotes.get(id);
          if (existingNote) {
            newNotes.set(id, { ...existingNote, ...updates });
          }
          return { notes: newNotes };
        });
      },

      removeNote: (id) => {
        set((state) => {
          const newNotes = new Map(state.notes);
          newNotes.delete(id);
          return { notes: newNotes };
        });
      },

      fetchNotes: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                queryParams.set(key, String(value));
              }
            });
          }

          const response = await fetch(`/api/notes?${queryParams.toString()}`);
          const result = await response.json();

          if (result.success && result.data) {
            const notes = result.data.data || result.data;
            get().setNotes(Array.isArray(notes) ? notes : []);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch notes');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createNote: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addNote(result.data);
            return result.data;
          } else {
            throw new Error(result.error?.message || 'Failed to create note');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateNoteData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateNote(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update note');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteNote: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/notes/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeNote(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete note');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getNoteById: (id) => {
        return get().notes.get(id);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'note-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            state: {
              ...parsed.state,
              notes: new Map(parsed.state.notes || []),
            },
          };
        },
        setItem: (name, newValue) => {
          const str = JSON.stringify({
            state: {
              ...newValue.state,
              notes: Array.from(newValue.state.notes.entries()),
            },
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
