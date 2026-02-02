// Tag Store
// Uses Zustand for state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TagCreateInput, TagUpdateInput } from '@/lib/domain/task.types';

interface TagState {
  tags: Map<string, any>;
  isLoading: boolean;
  error: string | null;
  selectedTagIds: string[];

  // Actions
  setTags: (tags: any[]) => void;
  addTag: (tag: any) => void;
  updateTag: (id: string, updates: Partial<any>) => void;
  removeTag: (id: string) => void;
  setSelectedTags: (ids: string[]) => void;
  toggleSelectedTag: (id: string) => void;

  // API actions
  fetchTags: () => Promise<void>;
  createTag: (data: TagCreateInput) => Promise<void>;
  updateTagData: (id: string, data: TagUpdateInput) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  // Utility
  getTagById: (id: string) => any | undefined;
  getSelectedTags: () => any[];
  clearError: () => void;
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tags: new Map(),
      isLoading: false,
      error: null,
      selectedTagIds: [],

      setTags: (tags) => {
        const tagMap = new Map();
        tags.forEach((tag) => tagMap.set(tag.id, tag));
        set({ tags: tagMap, error: null });
      },

      addTag: (tag) => {
        set((state) => {
          const newTags = new Map(state.tags);
          newTags.set(tag.id, tag);
          return { tags: newTags };
        });
      },

      updateTag: (id, updates) => {
        set((state) => {
          const newTags = new Map(state.tags);
          const existing = newTags.get(id);
          if (existing) {
            newTags.set(id, { ...existing, ...updates });
          }
          return { tags: newTags };
        });
      },

      removeTag: (id) => {
        set((state) => {
          const newTags = new Map(state.tags);
          newTags.delete(id);
          return { tags: newTags };
        });
      },

      setSelectedTags: (ids) => set({ selectedTagIds: ids }),

      toggleSelectedTag: (id) => {
        set((state) => {
          const selected = new Set(state.selectedTagIds);
          if (selected.has(id)) {
            selected.delete(id);
          } else {
            selected.add(id);
          }
          return { selectedTagIds: Array.from(selected) };
        });
      },

      fetchTags: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/tags');
          const result = await response.json();

          if (result.success && result.data) {
            get().setTags(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch tags');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createTag: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addTag(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to create tag');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateTagData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateTag(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update tag');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteTag: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeTag(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete tag');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getTagById: (id) => get().tags.get(id),

      getSelectedTags: () => {
        const { tags, selectedTagIds } = get();
        return selectedTagIds.map((id) => tags.get(id)).filter(Boolean);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tag-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedTagIds: state.selectedTagIds,
      }),
    }
  )
);
