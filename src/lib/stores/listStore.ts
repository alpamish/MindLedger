// List Store
// Uses Zustand for state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ListCreateInput, ListUpdateInput } from '@/lib/domain/task.types';

interface ListState {
  lists: Map<string, any>;
  isLoading: boolean;
  error: string | null;
  selectedListId: string | null;

  // Actions
  setLists: (lists: any[]) => void;
  addList: (list: any) => void;
  updateList: (id: string, updates: Partial<any>) => void;
  removeList: (id: string) => void;
  setSelectedList: (id: string | null) => void;

  // API actions
  fetchLists: (projectId?: string) => Promise<void>;
  createList: (data: ListCreateInput) => Promise<void>;
  updateListData: (id: string, data: ListUpdateInput) => Promise<void>;
  deleteList: (id: string) => Promise<void>;

  // Utility
  getListById: (id: string) => any | undefined;
  clearError: () => void;
}

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
      lists: new Map(),
      isLoading: false,
      error: null,
      selectedListId: null,

      setLists: (lists) => {
        const listMap = new Map();
        lists.forEach((list) => listMap.set(list.id, list));
        set({ lists: listMap, error: null });
      },

      addList: (list) => {
        set((state) => {
          const newLists = new Map(state.lists);
          newLists.set(list.id, list);
          return { lists: newLists };
        });
      },

      updateList: (id, updates) => {
        set((state) => {
          const newLists = new Map(state.lists);
          const existing = newLists.get(id);
          if (existing) {
            newLists.set(id, { ...existing, ...updates });
          }
          return { lists: newLists };
        });
      },

      removeList: (id) => {
        set((state) => {
          const newLists = new Map(state.lists);
          newLists.delete(id);
          return { lists: newLists };
        });
      },

      setSelectedList: (id) => set({ selectedListId: id }),

      fetchLists: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const url = projectId ? `/api/lists?projectId=${projectId}` : '/api/lists';
          const response = await fetch(url);
          const result = await response.json();

          if (result.success && result.data) {
            get().setLists(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch lists');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createList: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addList(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to create list');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateListData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/lists/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateList(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update list');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteList: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/lists/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeList(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete list');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getListById: (id) => get().lists.get(id),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'list-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedListId: state.selectedListId,
      }),
    }
  )
);
