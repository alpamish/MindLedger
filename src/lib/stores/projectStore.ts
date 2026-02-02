// Project Store
// Uses Zustand for state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProjectCreateInput, ProjectUpdateInput } from '@/lib/domain/task.types';

interface ProjectState {
  projects: Map<string, any>;
  isLoading: boolean;
  error: string | null;
  selectedProjectId: string | null;

  // Actions
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
  updateProject: (id: string, updates: Partial<any>) => void;
  removeProject: (id: string) => void;
  setSelectedProject: (id: string | null) => void;

  // API actions
  fetchProjects: () => Promise<void>;
  createProject: (data: ProjectCreateInput) => Promise<void>;
  updateProjectData: (id: string, data: ProjectUpdateInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Utility
  getProjectById: (id: string) => any | undefined;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: new Map(),
      isLoading: false,
      error: null,
      selectedProjectId: null,

      setProjects: (projects) => {
        const projectMap = new Map();
        projects.forEach((project) => projectMap.set(project.id, project));
        set({ projects: projectMap, error: null });
      },

      addProject: (project) => {
        set((state) => {
          const newProjects = new Map(state.projects);
          newProjects.set(project.id, project);
          return { projects: newProjects };
        });
      },

      updateProject: (id, updates) => {
        set((state) => {
          const newProjects = new Map(state.projects);
          const existing = newProjects.get(id);
          if (existing) {
            newProjects.set(id, { ...existing, ...updates });
          }
          return { projects: newProjects };
        });
      },

      removeProject: (id) => {
        set((state) => {
          const newProjects = new Map(state.projects);
          newProjects.delete(id);
          return { projects: newProjects };
        });
      },

      setSelectedProject: (id) => set({ selectedProjectId: id }),

      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/projects');
          const result = await response.json();

          if (result.success && result.data) {
            get().setProjects(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to fetch projects');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createProject: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().addProject(result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to create project');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateProjectData: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json();

          if (result.success && result.data) {
            get().updateProject(id, result.data);
          } else {
            throw new Error(result.error?.message || 'Failed to update project');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });
          const result = await response.json();

          if (result.success) {
            get().removeProject(id);
          } else {
            throw new Error(result.error?.message || 'Failed to delete project');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getProjectById: (id) => get().projects.get(id),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'project-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);
