// Domain types for Todo Application
// Extends Prisma types with additional domain logic

import { TaskStatus, TaskPriority, DependencyType, ViewType } from '@prisma/client';

// ============================================
// TASK TYPES
// ============================================

export type TaskStatusType = TaskStatus;
export type TaskPriorityType = TaskPriority;

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  dueDate?: Date;
  startDate?: Date;
  projectId?: string;
  listId?: string;
  parentId?: string;
  recurrenceRule?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  dueDate?: Date | null;
  startDate?: Date | null;
  projectId?: string | null;
  listId?: string | null;
  parentId?: string | null;
  recurrenceRule?: string | null;
  isArchived?: boolean;
  order?: number;
  position?: number;
}

export interface TaskFilters {
  status?: TaskStatusType[];
  priority?: TaskPriorityType[];
  projectId?: string[];
  listId?: string[];
  tagIds?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  startDateFrom?: Date;
  startDateTo?: Date;
  isArchived?: boolean;
  isCompleted?: boolean;
  isOverdue?: boolean;
  searchQuery?: string;
  hasDependencies?: boolean;
  hasSubtasks?: boolean;
}

export interface TaskSort {
  field: 'dueDate' | 'priority' | 'createdAt' | 'order' | 'title' | 'status';
  direction: 'asc' | 'desc';
}

// ============================================
// PROJECT TYPES
// ============================================

export interface ProjectCreateInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
  order?: number;
}

// ============================================
// LIST TYPES
// ============================================

export interface ListCreateInput {
  name: string;
  description?: string;
  color?: string;
  projectId?: string;
  isDefault?: boolean;
}

export interface ListUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  projectId?: string | null;
  order?: number;
}

// ============================================
// TAG TYPES
// ============================================

export interface TagCreateInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface TagUpdateInput {
  name?: string;
  color?: string;
  icon?: string;
  order?: number;
}

// ============================================
// DEPENDENCY TYPES
// ============================================

export type DependencyTypeType = DependencyType;

export interface TaskDependencyCreateInput {
  dependentTaskId: string;
  dependencyTaskId: string;
  type?: DependencyTypeType;
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// TIME TRACKING TYPES
// ============================================

export interface TimeTrackingInput {
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes?: string;
}

export interface TimeSession {
  id: string;
  taskId: string;
  startedAt: DateTime;
  completedAt?: DateTime;
  notes?: string;
}

// ============================================
// REMINDER TYPES
// ============================================

export interface ReminderCreateInput {
  taskId: string;
  remindAt: Date;
}

export interface ReminderUpdateInput {
  remindAt?: Date;
  isRead?: boolean;
  dismissedAt?: Date;
}

// ============================================
// VIEW TYPES
// ============================================

export type ViewTypeEnum = ViewType;

export interface ViewFilters {
  [key: string]: any;
}

export interface ViewSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ViewGroupBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SavedViewCreateInput {
  name: string;
  type: ViewTypeEnum;
  icon?: string;
  color?: string;
  filters: ViewFilters;
  sort?: ViewSort;
  groupBy?: ViewGroupBy;
}

export interface SavedViewUpdateInput {
  name?: string;
  type?: ViewTypeEnum;
  icon?: string;
  color?: string;
  filters?: ViewFilters;
  sort?: ViewSort;
  groupBy?: ViewGroupBy;
  order?: number;
}

// ============================================
// SMART VIEW RULES
// ============================================

export interface FilterRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'isSet' | 'isNotSet';
  value?: any;
}

export interface FilterGroup {
  operator: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

export interface SmartViewConfig {
  filterGroup: FilterGroup;
  sort?: ViewSort[];
  groupBy?: ViewGroupBy;
  limit?: number;
}

// ============================================
// RECURRENCE TYPES
// ============================================

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: Date;
  count?: number;
}

export interface RecurrenceInstance {
  taskId: string;
  originalDueDate: Date;
  generatedDueDate: Date;
  sequence: number;
}

// ============================================
// ATTACHMENT TYPES
// ============================================

export interface AttachmentCreateInput {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType?: string;
  uploadedBy?: string;
}

// ============================================
// WORKSPACE TYPES
// ============================================

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
}

export interface WorkspaceUpdateInput {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface WorkspaceMemberRole {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

// ============================================
// UTILITY TYPES
// ============================================

export type DateTime = string;

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

// ============================================
// REAL-TIME SYNC TYPES
// ============================================

export interface SyncEvent {
  type: 'create' | 'update' | 'delete' | 'bulk';
  entity: 'task' | 'project' | 'list' | 'tag' | 'dependency' | 'reminder' | 'timeTracking';
  data: any;
  timestamp: string;
  userId?: string;
  workspaceId: string;
}

export interface SyncMessage {
  events: SyncEvent[];
  clientId?: string;
}

// ============================================
// OFFLINE STORAGE TYPES
// ============================================

export interface OfflineTask {
  id: string;
  data: any;
  operation: 'create' | 'update' | 'delete';
  timestamp: string;
  synced: boolean;
}

export interface OfflineQueue {
  pendingOperations: OfflineTask[];
  lastSyncAt: string;
  isOnline: boolean;
}

// ============================================
// BULK OPERATION TYPES
// ============================================

export interface BulkOperation {
  operation: 'update' | 'delete' | 'archive' | 'unarchive' | 'move';
  taskIds: string[];
  data?: any;
}

export interface BulkResult {
  success: number;
  failed: number;
  errors: Array<{
    taskId: string;
    error: string;
  }>;
}

// ============================================
// TASK STATISTICS
// ============================================

export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatusType, number>;
  byPriority: Record<TaskPriorityType, number>;
  completed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  withTimeTracking: number;
  estimatedTotalMinutes: number;
  actualTotalMinutes: number;
}

// ============================================
// SEARCH TYPES
// ============================================

export interface SearchQuery {
  query: string;
  filters?: TaskFilters;
  includeArchived?: boolean;
  limit?: number;
}

export interface SearchResult {
  tasks: any[];
  total: number;
  highlights: Record<string, string[]>;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: string;
  type: 'reminder' | 'due_date' | 'overdue' | 'dependency' | 'assignment';
  taskId?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: DateTime;
  actionUrl?: string;
}

// ============================================
// EXPORT/IMPORT TYPES
// ============================================

export interface ExportOptions {
  includeCompleted?: boolean;
  includeArchived?: boolean;
  includeAttachments?: boolean;
  format: 'json' | 'csv';
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}
