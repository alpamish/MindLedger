// Study Tracker Store
// Uses Zustand for state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StudyCategory } from '@prisma/client';

interface StudyGoalState {
  goals: Map<string, any>;
  sessions: Map<string, any>;
  statistics: any | null;
  isLoading: boolean;
  error: string | null;
  selectedGoalId: string | null;
  isLoggingSession: boolean;

  // Goal actions
  setGoals: (goals: any[]) => void;
  addGoal: (goal: any) => void;
  updateGoal: (id: string, updates: Partial<any>) => void;
  removeGoal: (id: string) => void;
  setSelectedGoal: (id: string | null) => void;

  // Session actions
  setSessions: (sessions: any[]) => void;
  addSession: (session: any) => void;
  updateSession: (id: string, updates: Partial<any>) => void;
  removeSession: (id: string) => void;

  // API actions
  fetchGoals: () => Promise<void>;
  createGoal: (data: any) => Promise<void>;
  updateGoalData: (id: string, data: any) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  fetchSessions: (goalId?: string, days?: number) => Promise<void>;
  logSession: (data: any) => Promise<void>;
  
  fetchStatistics: (goalId?: string, days?: number) => Promise<void>;

  // Utility
  getGoalById: (id: string) => any | undefined;
  clearError: () => void;
}

export const useStudyStore = create<StudyGoalState>()(
  persist(
    (set, get) => ({
      goals: new Map(),
      sessions: new Map(),
      statistics: null,
      isLoading: false,
      error: null,
      selectedGoalId: null,
      isLoggingSession: false,

      setGoals: (goals) => {
        const goalMap = new Map();
        goals.forEach((goal) => goalMap.set(goal.id, goal));
        set({ goals: goalMap, error: null });
      },

      addGoal: (goal) => {
        set((state) => {
          const newGoals = new Map(state.goals);
          newGoals.set(goal.id, goal);
          return { goals: newGoals };
        });
      },

      updateGoal: (id, updates) => {
        set((state) => {
          const newGoals = new Map(state.goals);
          const existing = newGoals.get(id);
          if (existing) {
            newGoals.set(id, { ...existing, ...updates });
          }
          return { goals: newGoals };
        });
      },

      removeGoal: (id) => {
        set((state) => {
          const newGoals = new Map(state.goals);
          newGoals.delete(id);
          return { goals: newGoals };
        });
      },

      setSelectedGoal: (id) => set({ selectedGoalId: id }),

      setSessions: (sessions) => {
        const sessionMap = new Map();
        sessions.forEach((session) => sessionMap.set(session.id, session));
        set({ sessions: sessionMap });
      },

      addSession: (session) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          newSessions.set(session.id, session);
          return { sessions: newSessions };
        });
      },

      updateSession: (id, updates) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          const existing = newSessions.get(id);
          if (existing) {
            newSessions.set(id, { ...existing, ...updates });
          }
          return { sessions: newSessions };
        });
      },

      removeSession: (id) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          newSessions.delete(id);
          return { sessions: newSessions };
        });
      },

      fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/study-goals');
          const result = await response.json();

          if (result.success && result.data) {
            get().setGoals(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch study goals');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createGoal: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/study-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addGoal(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to create study goal');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateGoalData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/study-goals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateGoal(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update study goal');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/study-goals/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeGoal(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete study goal');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchSessions: async (goalId?, days = 30) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (goalId) params.append('goalId', goalId);
          if (days) params.append('days', days.toString());

          const response = await fetch(`/api/study-sessions?${params}`);
          const result = await response.json();

          if (result.success && result.data) {
            get().setSessions(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch study sessions');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      logSession: async (data) => {
        set({ isLoggingSession: true, error: null });
        try {
          const response = await fetch('/api/study-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addSession(result.data);
            // Refresh goals and statistics to update progress displays
            await get().fetchGoals();
            await get().fetchStatistics();
          } else {
            throw new Error(result.error?.message || 'Failed to log study session');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoggingSession: false });
        }
      },

      fetchStatistics: async (goalId?, days = 30) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (goalId) params.append('goalId', goalId);
          params.append('days', days.toString());

          const response = await fetch(`/api/study-statistics?${params}`);
          const result = await response.json();

          if (result.success && result.data) {
            set({ statistics: result.data });
          } else {
            throw new Error(result.error?.message || 'Failed to fetch study statistics');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getGoalById: (id) => get().goals.get(id),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'study-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedGoalId: state.selectedGoalId,
      }),
    }
  )
);

// Category configuration
export const StudyCategoryConfig: Record<StudyCategory, { label: string; icon: string; color: string }> = {
  LANGUAGE: { label: 'Language', icon: '🌍', color: '#3B82F6' },
  BOOK: { label: 'Book', icon: '📚', color: '#8B5CF6' },
  COURSE: { label: 'Course', icon: '🎓', color: '#10B981' },
  SKILL: { label: 'Skill', icon: '💪', color: '#F59E0B' },
  FITNESS: { label: 'Fitness', icon: '🏃', color: '#EF4444' },
  MEDITATION: { label: 'Meditation', icon: '🧘', color: '#6366F1' },
  OTHER: { label: 'Other', icon: '📌', color: '#6B7280' },
};
