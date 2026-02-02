// Domain utility functions for Todo Application

import { TaskStatus, TaskPriority } from '@prisma/client';
import type {
  TaskStatusType,
  TaskPriorityType,
  TaskFilters,
  DependencyValidationResult,
  RecurrenceRule,
  RecurrenceInstance,
} from './task.types';

// ============================================
// TASK STATUS UTILITIES
// ============================================

export const TaskStatusConfig: Record<TaskStatusType, { label: string; color: string; icon: string }> = {
  TODO: { label: 'To Do', color: 'gray', icon: 'circle' },
  IN_PROGRESS: { label: 'In Progress', color: 'blue', icon: 'clock' },
  IN_REVIEW: { label: 'In Review', color: 'purple', icon: 'eye' },
  BLOCKED: { label: 'Blocked', color: 'red', icon: 'alert-circle' },
  DONE: { label: 'Done', color: 'green', icon: 'check-circle' },
  CANCELLED: { label: 'Cancelled', color: 'gray', icon: 'x-circle' },
};

export const TaskPriorityConfig: Record<TaskPriorityType, { label: string; color: string; value: number }> = {
  URGENT: { label: 'Urgent', color: 'red', value: 4 },
  HIGH: { label: 'High', color: 'orange', value: 3 },
  MEDIUM: { label: 'Medium', color: 'yellow', value: 2 },
  LOW: { label: 'Low', color: 'green', value: 1 },
  NONE: { label: 'No Priority', color: 'gray', value: 0 },
};

export function isTaskCompleted(status: TaskStatusType): boolean {
  return status === TaskStatus.DONE;
}

export function isTaskActive(status: TaskStatusType): boolean {
  return [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW].includes(status);
}

export function isTaskBlocked(status: TaskStatusType): boolean {
  return status === TaskStatus.BLOCKED;
}

export function getNextStatus(currentStatus: TaskStatusType): TaskStatusType {
  const statusOrder: TaskStatusType[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
  ];
  const currentIndex = statusOrder.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === statusOrder.length - 1) {
    return currentStatus;
  }
  return statusOrder[currentIndex + 1];
}

// ============================================
// TASK PRIORITY UTILITIES
// ============================================

export function getPriorityWeight(priority: TaskPriorityType): number {
  return TaskPriorityConfig[priority].value;
}

export function comparePriority(a: TaskPriorityType, b: TaskPriorityType): number {
  return getPriorityWeight(b) - getPriorityWeight(a);
}

// ============================================
// DATE UTILITIES
// ============================================

export function isOverdue(dueDate: Date | null | undefined, status: TaskStatusType): boolean {
  if (!dueDate || isTaskCompleted(status)) {
    return false;
  }
  return new Date(dueDate) < new Date();
}

export function isDueToday(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  return (
    today.getFullYear() === due.getFullYear() &&
    today.getMonth() === due.getMonth() &&
    today.getDate() === due.getDate()
  );
}

export function isDueThisWeek(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return due >= weekStart && due < weekEnd;
}

export function isDueUpcoming(dueDate: Date | null | undefined, days: number = 7): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + days);
  return due >= now && due <= futureDate;
}

// ============================================
// FILTER UTILITIES
// ============================================

export function matchesFilters(task: any, filters: TaskFilters): boolean {
  // Status filter
  if (filters.status && filters.status.length > 0) {
    if (!filters.status.includes(task.status)) return false;
  }

  // Priority filter
  if (filters.priority && filters.priority.length > 0) {
    if (!filters.priority.includes(task.priority)) return false;
  }

  // Project filter
  if (filters.projectId && filters.projectId.length > 0) {
    if (!task.projectId || !filters.projectId.includes(task.projectId)) return false;
  }

  // List filter
  if (filters.listId && filters.listId.length > 0) {
    if (!task.listId || !filters.listId.includes(task.listId)) return false;
  }

  // Tag filter
  if (filters.tagIds && filters.tagIds.length > 0) {
    const taskTagIds = task.tags?.map((t: any) => t.tagId) || [];
    const hasAllTags = filters.tagIds.every((tagId) => taskTagIds.includes(tagId));
    if (!hasAllTags) return false;
  }

  // Due date range filter
  if (filters.dueDateFrom) {
    if (!task.dueDate || new Date(task.dueDate) < filters.dueDateFrom) return false;
  }
  if (filters.dueDateTo) {
    if (!task.dueDate || new Date(task.dueDate) > filters.dueDateTo) return false;
  }

  // Start date range filter
  if (filters.startDateFrom) {
    if (!task.startDate || new Date(task.startDate) < filters.startDateFrom) return false;
  }
  if (filters.startDateTo) {
    if (!task.startDate || new Date(task.startDate) > filters.startDateTo) return false;
  }

  // Archived filter
  if (filters.isArchived !== undefined) {
    if (task.isArchived !== filters.isArchived) return false;
  }

  // Completed filter
  if (filters.isCompleted !== undefined) {
    const completed = task.status === TaskStatus.DONE;
    if (completed !== filters.isCompleted) return false;
  }

  // Overdue filter
  if (filters.isOverdue !== undefined) {
    const overdue = isOverdue(task.dueDate, task.status);
    if (overdue !== filters.isOverdue) return false;
  }

  // Search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    const title = task.title?.toLowerCase() || '';
    const description = task.description?.toLowerCase() || '';
    if (!title.includes(query) && !description.includes(query)) return false;
  }

  return true;
}

// ============================================
// DEPENDENCY VALIDATION
// ============================================

export function validateDependency(
  dependentTaskId: string,
  dependencyTaskId: string,
  existingDependencies: any[]
): DependencyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Prevent self-dependency
  if (dependentTaskId === dependencyTaskId) {
    errors.push('A task cannot depend on itself');
  }

  // Prevent circular dependencies
  if (wouldCreateCycle(dependentTaskId, dependencyTaskId, existingDependencies)) {
    errors.push('This would create a circular dependency');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function wouldCreateCycle(
  fromTaskId: string,
  toTaskId: string,
  dependencies: any[]
): boolean {
  const graph = buildDependencyGraph(dependencies);
  return hasPath(graph, toTaskId, fromTaskId);
}

function buildDependencyGraph(dependencies: any[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  for (const dep of dependencies) {
    const { dependentTaskId, dependencyTaskId } = dep;
    if (!graph.has(dependentTaskId)) {
      graph.set(dependentTaskId, []);
    }
    graph.get(dependentTaskId)!.push(dependencyTaskId);
  }
  
  return graph;
}

function hasPath(graph: Map<string, string[]>, from: string, to: string, visited = new Set<string>()): boolean {
  if (from === to) return true;
  if (visited.has(from)) return false;
  
  visited.add(from);
  const neighbors = graph.get(from) || [];
  
  for (const neighbor of neighbors) {
    if (hasPath(graph, neighbor, to, visited)) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// RECURRENCE UTILITIES
// ============================================

export function generateRecurrenceInstances(
  task: any,
  rule: RecurrenceRule,
  count: number = 10
): RecurrenceInstance[] {
  const instances: RecurrenceInstance[] = [];
  const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
  
  for (let i = 1; i <= count; i++) {
    const nextDate = calculateNextDate(baseDate, rule, i);
    
    // Check if we've reached the end date
    if (rule.endDate && nextDate > rule.endDate) {
      break;
    }
    
    instances.push({
      taskId: task.id,
      originalDueDate: baseDate,
      generatedDueDate: nextDate,
      sequence: i,
    });
  }
  
  return instances;
}

function calculateNextDate(baseDate: Date, rule: RecurrenceRule, sequence: number): Date {
  const nextDate = new Date(baseDate);
  const interval = rule.interval || 1;
  
  switch (rule.frequency) {
    case 'DAILY':
      nextDate.setDate(baseDate.getDate() + (sequence * interval));
      break;
      
    case 'WEEKLY':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Advanced weekly recurrence with specific days
        const weeksToAdd = Math.floor((sequence - 1) / rule.daysOfWeek.length) * interval;
        const dayIndex = (sequence - 1) % rule.daysOfWeek.length;
        nextDate.setDate(baseDate.getDate() + (weeksToAdd * 7));
        nextDate.setDate(baseDate.getDate() + (rule.daysOfWeek[dayIndex] - baseDate.getDay()));
      } else {
        nextDate.setDate(baseDate.getDate() + (sequence * 7 * interval));
      }
      break;
      
    case 'MONTHLY':
      if (rule.dayOfMonth) {
        nextDate.setMonth(baseDate.getMonth() + (sequence * interval));
        nextDate.setDate(rule.dayOfMonth);
      } else {
        nextDate.setMonth(baseDate.getMonth() + (sequence * interval));
      }
      break;
      
    case 'YEARLY':
      if (rule.monthOfYear !== undefined && rule.dayOfMonth) {
        nextDate.setFullYear(baseDate.getFullYear() + sequence);
        nextDate.setMonth(rule.monthOfYear);
        nextDate.setDate(rule.dayOfMonth);
      } else {
        nextDate.setFullYear(baseDate.getFullYear() + (sequence * interval));
      }
      break;
  }
  
  return nextDate;
}

export function parseRecurrenceRule(ruleString: string): RecurrenceRule | null {
  try {
    return JSON.parse(ruleString);
  } catch {
    return null;
  }
}

export function stringifyRecurrenceRule(rule: RecurrenceRule): string {
  return JSON.stringify(rule);
}

// ============================================
// TIME TRACKING UTILITIES
// ============================================

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function calculateProgress(estimated: number, actual: number): number {
  if (estimated === 0) return 0;
  return Math.min((actual / estimated) * 100, 100);
}

// ============================================
// SORT UTILITIES
// ============================================

export function sortTasks(tasks: any[], sortBy: { field: string; direction: 'asc' | 'desc' }): any[] {
  return [...tasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy.field) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
        
      case 'priority':
        comparison = comparePriority(a.priority, b.priority);
        break;
        
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
        
      case 'order':
        comparison = (a.order || 0) - (b.order || 0);
        break;
        
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
        
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
        
      default:
        comparison = 0;
    }
    
    return sortBy.direction === 'desc' ? -comparison : comparison;
  });
}

// ============================================
// STATISTICS UTILITIES
// ============================================

export function calculateTaskStatistics(tasks: any[]) {
  const stats = {
    total: tasks.length,
    byStatus: {} as Record<TaskStatusType, number>,
    byPriority: {} as Record<TaskPriorityType, number>,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    withTimeTracking: 0,
    estimatedTotalMinutes: 0,
    actualTotalMinutes: 0,
  };

  // Initialize counters
  Object.values(TaskStatus).forEach((status) => {
    stats.byStatus[status as TaskStatusType] = 0;
  });
  Object.values(TaskPriority).forEach((priority) => {
    stats.byPriority[priority as TaskPriorityType] = 0;
  });

  // Calculate statistics
  for (const task of tasks) {
    // By status
    stats.byStatus[task.status as TaskStatusType]++;

    // By priority
    stats.byPriority[task.priority as TaskPriorityType]++;

    // Completed
    if (isTaskCompleted(task.status)) {
      stats.completed++;
    }

    // Overdue
    if (isOverdue(task.dueDate, task.status)) {
      stats.overdue++;
    }

    // Due today
    if (isDueToday(task.dueDate)) {
      stats.dueToday++;
    }

    // Due this week
    if (isDueThisWeek(task.dueDate)) {
      stats.dueThisWeek++;
    }

    // Time tracking
    if (task.timeTracking && task.timeTracking.length > 0) {
      stats.withTimeTracking++;
      for (const tt of task.timeTracking) {
        if (tt.estimatedMinutes) {
          stats.estimatedTotalMinutes += tt.estimatedMinutes;
        }
        if (tt.actualMinutes) {
          stats.actualTotalMinutes += tt.actualMinutes;
        }
      }
    }
  }

  return stats;
}

// ============================================
// SUBTASK UTILITIES
// ============================================

export function buildTaskTree(tasks: any[]): any[] {
  const taskMap = new Map<string, any>();
  const rootTasks: any[] = [];

  // First pass: create map
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, subtasks: [] });
  }

  // Second pass: build tree
  for (const task of tasks) {
    const taskNode = taskMap.get(task.id)!;
    
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId)!.subtasks.push(taskNode);
    } else {
      rootTasks.push(taskNode);
    }
  }

  return rootTasks;
}

export function flattenTaskTree(tasks: any[]): any[] {
  const result: any[] = [];
  
  function flatten(task: any) {
    result.push(task);
    if (task.subtasks && task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        flatten(subtask);
      }
    }
  }
  
  for (const task of tasks) {
    flatten(task);
  }
  
  return result;
}

export function getTaskDepth(task: any, allTasks: any[]): number {
  let depth = 0;
  let currentTask = task;
  
  while (currentTask.parentId) {
    depth++;
    currentTask = allTasks.find((t) => t.id === currentTask.parentId) || currentTask;
    if (depth > 100) break; // Prevent infinite loops
  }
  
  return depth;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

export function validateTaskTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Task title is required' };
  }
  if (title.length > 500) {
    return { valid: false, error: 'Task title must be less than 500 characters' };
  }
  return { valid: true };
}

export function validateTaskDescription(description?: string): { valid: boolean; error?: string } {
  if (description && description.length > 10000) {
    return { valid: false, error: 'Task description must be less than 10,000 characters' };
  }
  return { valid: true };
}

// ============================================
// MARKDOWN UTILITIES
// ============================================

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
    .replace(/~~([^~]+)~~/g, '$1') // Strikethrough
    .replace(/\n/g, ' ') // Newlines
    .trim();
}

export function truncateMarkdown(markdown: string, maxLength: number = 200): string {
  const plainText = stripMarkdown(markdown);
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
}
