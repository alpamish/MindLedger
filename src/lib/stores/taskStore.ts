import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilters,
  OfflineTask,
  OfflineQueue,
} from '@/lib/domain/task.types';
import { TaskStatus, TaskPriority } from '@prisma/client';

interface TaskState {
  tasks: Map<string, any>;
  isLoading: boolean;
  error: string | null;
  currentView: 'all' | 'inbox' | 'today' | 'upcoming' | 'overdue' | 'priority' | 'tags';
  selectedTaskId: string | null;
  filters: TaskFilters;

  offlineQueue: OfflineQueue;
  isOnline: boolean;

  setTasks: (tasks: any[]) => void;
  addTask: (task: any) => void;
  updateTask: (id: string, updates: Partial<any>) => void;
  removeTask: (id: string) => void;
  setSelectedTask: (id: string | null) => void;
  setCurrentView: (view: TaskState['currentView']) => void;
  setFilters: (filters: TaskFilters) => void;

  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (data: TaskCreateInput) => Promise<void>;
  updateTaskData: (id: string, data: TaskUpdateInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkUpdate: (taskIds: string[], data: any) => Promise<void>;

  syncOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;

  getTaskById: (id: string) => any | undefined;
  getFilteredTasks: () => any[];
  clearError: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: new Map(),
      isLoading: false,
      error: null,
      currentView: 'inbox',
      selectedTaskId: null,
      filters: {},
      offlineQueue: {
        pendingOperations: [],
        lastSyncAt: new Date().toISOString(),
        isOnline: true,
      },
      isOnline: true,

      setTasks: (tasks) => {
        const taskMap = new Map();
        tasks.forEach((task) => taskMap.set(task.id, task));
        set({ tasks: taskMap, error: null });
      },

      addTask: (task) => {
        set((state) => {
          const newTasks = new Map(state.tasks);
          newTasks.set(task.id, task);
          return { tasks: newTasks };
        });
      },

      updateTask: (id, updates) => {
        set((state) => {
          const newTasks = new Map(state.tasks);
          const existingTask = newTasks.get(id);
          if (existingTask) {
            newTasks.set(id, { ...existingTask, ...updates });
          }
          return { tasks: newTasks };
        });
      },

      removeTask: (id) => {
        set((state) => {
          const newTasks = new Map(state.tasks);
          newTasks.delete(id);
          return { tasks: newTasks };
        });
      },

      setSelectedTask: (id) => set({ selectedTaskId: id }),
      setCurrentView: (view) => set({ currentView: view }),
      setFilters: (filters) => set({ filters }),

      fetchTasks: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                  value.forEach((v) => queryParams.append(key, String(v)));
                } else {
                  queryParams.set(key, String(value));
                }
              }
            });
          }

          const response = await fetch(`/api/tasks?${queryParams.toString()}`);
          const result = await response.json();

          if (result.success && result.data) {
            const tasks = result.data.data || result.data;
            get().setTasks(Array.isArray(tasks) ? tasks : []);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch tasks');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createTask: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addTask(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to create task');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });

          if (!get().isOnline) {
            const offlineTask: OfflineTask = {
              id: `temp-${Date.now()}`,
              data,
              operation: 'create',
              timestamp: new Date().toISOString(),
              synced: false,
            };
            set((state) => ({
              offlineQueue: {
                ...state.offlineQueue,
                pendingOperations: [...state.offlineQueue.pendingOperations, offlineTask],
              },
            }));
          }
        } finally {
          set({ isLoading: false });
        }
      },

      updateTaskData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateTask(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update task');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteTask: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeTask(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete task');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      bulkUpdate: async (taskIds, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/tasks/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'update',
              taskIds,
              data,
            }),
          });
          const result = await response.json();

          if (result.success) {
            await get().fetchTasks();
          } else {
            throw new Error(result.error?.message || 'Failed to bulk update tasks');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      syncOfflineQueue: async () => {
        const { offlineQueue } = get();
        if (offlineQueue.pendingOperations.length === 0) return;

        set({ isLoading: true });

        for (const operation of offlineQueue.pendingOperations) {
          try {
            if (operation.operation === 'create') {
              await get().createTask(operation.data);
            }
          } catch (error) {
            console.error('Failed to sync operation:', error);
          }
        }

        set({
          offlineQueue: {
            ...offlineQueue,
            pendingOperations: [],
            lastSyncAt: new Date().toISOString(),
          },
          isLoading: false,
        });
      },

      clearOfflineQueue: () => {
        set((state) => ({
          offlineQueue: {
            ...state.offlineQueue,
            pendingOperations: [],
          },
        }));
      },

      getTaskById: (id) => {
        return get().tasks.get(id);
      },

      getFilteredTasks: () => {
        const { tasks, currentView, filters } = get();
        const taskArray = Array.from(tasks.values());
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return taskArray.filter((task) => {
          if (task.isArchived) return false;

          switch (currentView) {
            case 'inbox':
              return task.status === TaskStatus.TODO && !task.dueDate;

            case 'today':
              return task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString();

            case 'upcoming':
              return task.dueDate &&
                     new Date(task.dueDate) >= today &&
                     new Date(task.dueDate) <= weekEnd;

            case 'overdue':
              return task.dueDate &&
                     new Date(task.dueDate) < today &&
                     task.status !== TaskStatus.DONE;

            case 'priority':
              return task.priority === TaskPriority.URGENT || task.priority === TaskPriority.HIGH;

            case 'tags':
              return task.tags && task.tags.length > 0;

            default:
              return true;
          }
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentView: state.currentView,
        selectedTaskId: state.selectedTaskId,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useTaskStore.setState({ isOnline: true });
    useTaskStore.getState().syncOfflineQueue();
  });

  window.addEventListener('offline', () => {
    useTaskStore.setState({ isOnline: false });
  });
}
