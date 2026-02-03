'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TaskStatusConfig, TaskPriorityConfig } from '@/lib/domain/task.utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Tag as TagIcon,
  Clock,
  AlertCircle,
  Circle,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  MoreVertical,
  ChevronRight,
  Check,
  GripVertical,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useTaskStore } from '@/lib/stores/taskStore';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'circle': Circle,
  'clock': Clock,
  'eye': Eye,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'ban': Ban,
};

const statusOrder: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.BLOCKED,
  TaskStatus.DONE,
];

const columnStyles: Record<TaskStatus, { bg: string; border: string; headerBg: string; icon: string }> = {
  [TaskStatus.TODO]: {
    bg: 'bg-slate-50/50',
    border: 'border-slate-200',
    headerBg: 'bg-slate-100',
    icon: 'text-slate-600',
  },
  [TaskStatus.IN_PROGRESS]: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    headerBg: 'bg-blue-100',
    icon: 'text-blue-600',
  },
  [TaskStatus.IN_REVIEW]: {
    bg: 'bg-purple-50/50',
    border: 'border-purple-200',
    headerBg: 'bg-purple-100',
    icon: 'text-purple-600',
  },
  [TaskStatus.BLOCKED]: {
    bg: 'bg-red-50/50',
    border: 'border-red-200',
    headerBg: 'bg-red-100',
    icon: 'text-red-600',
  },
  [TaskStatus.DONE]: {
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-100',
    icon: 'text-emerald-600',
  },
  [TaskStatus.CANCELLED]: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    headerBg: 'bg-gray-100',
    icon: 'text-gray-500',
  },
};

interface KanbanBoardProps {
  tasks: any[];
  onTaskUpdate: (taskId: string, updates: any) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskClick: (task: any) => void;
}

export function KanbanBoard({ tasks, onTaskUpdate, onTaskDelete, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const taskStore = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = statusOrder.map((status) => {
    const config = TaskStatusConfig[status];
    const IconComponent = iconMap[config.icon] || Circle;
    return {
      id: status,
      title: config.label,
      status,
      icon: IconComponent,
      tasks: tasks.filter((task) => task.status === status),
    };
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = columns.find((col) => col.id === overId || col.tasks.some((t) => t.id === overId));
    if (!overColumn) return;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem || activeTaskItem.status === overColumn.id) return;

    onTaskUpdate(activeId, { status: overColumn.id });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = columns.find((col) => col.tasks.some((t) => t.id === overId));
    if (overColumn) {
      const task = tasks.find((t) => t.id === activeId);
      if (task && task.status === overColumn.id) {
        const oldIndex = overColumn.tasks.findIndex((t) => t.id === activeId);
        const newIndex = overColumn.tasks.findIndex((t) => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(overColumn.tasks, oldIndex, newIndex);
          reorderedTasks.forEach((t, index) => {
            onTaskUpdate(t.id, { order: index });
          });
        }
      }
    }
  };

  const getPriorityStyles = (priority: string) => {
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      URGENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      NONE: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    };
    return styles[priority] || styles.NONE;
  };

  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await onTaskDelete(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    try {
      const isCompleting = task.status !== TaskStatus.DONE;
      const newStatus = isCompleting ? TaskStatus.DONE : TaskStatus.TODO;
      // Auto-archive when marking as done
      const updates = isCompleting 
        ? { status: newStatus, isArchived: true }
        : { status: newStatus, isArchived: false };
      await onTaskUpdate(task.id, updates);
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const renderTask = (task: any) => {
    const priorityStyle = getPriorityStyles(task.priority);
    const isDone = task.status === TaskStatus.DONE;
    
    return (
      <div
        key={task.id}
        className={cn(
          'group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200',
          'mb-3 cursor-grab active:cursor-grabbing',
          isDone && 'opacity-75 bg-slate-50'
        )}
        onClick={() => onTaskClick(task)}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => setHoveredTaskId(null)}
      >
        {/* Priority indicator stripe */}
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
          task.priority === TaskPriority.URGENT && 'bg-red-500',
          task.priority === TaskPriority.HIGH && 'bg-orange-500',
          task.priority === TaskPriority.MEDIUM && 'bg-yellow-500',
          task.priority === TaskPriority.LOW && 'bg-blue-500',
          task.priority === TaskPriority.NONE && 'bg-slate-300'
        )} />

        <div className="p-3 pl-4">
          {/* Header with title and actions */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={cn(
              'font-medium text-sm flex-1 leading-relaxed',
              isDone && 'line-through text-slate-500'
            )}>
              {task.title}
            </h4>
            
            {/* Quick actions on hover */}
            <div className={cn(
              'flex items-center gap-1 transition-opacity duration-150',
              hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0 md:opacity-0'
            )}>
              <button
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  isDone 
                    ? 'text-slate-400 hover:bg-slate-100' 
                    : 'text-emerald-600 hover:bg-emerald-50'
                )}
                onClick={(e) => handleToggleStatus(e, task)}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                onClick={(e) => handleDelete(e, task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Meta info row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Due date */}
            {task.dueDate && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
                isPast(new Date(task.dueDate)) && !isDone && !isToday(new Date(task.dueDate))
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              )}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), 'MMM d')}
                {isPast(new Date(task.dueDate)) && !isDone && !isToday(new Date(task.dueDate)) && (
                  <AlertCircle className="h-3 w-3 ml-0.5" />
                )}
              </span>
            )}

            {/* Priority badge */}
            <span className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border',
              priorityStyle.bg,
              priorityStyle.text,
              priorityStyle.border
            )}>
              {TaskPriorityConfig[task.priority]?.label}
            </span>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.slice(0, 2).map((tagRelation: any) => (
                  <span
                    key={tagRelation.tag.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium text-slate-600"
                    style={{ 
                      backgroundColor: tagRelation.tag.color ? `${tagRelation.tag.color}20` : '#f1f5f9',
                      color: tagRelation.tag.color || '#475569'
                    }}
                  >
                    <TagIcon className="h-3 w-3" />
                    {tagRelation.tag.name}
                  </span>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-xs text-slate-400 px-1">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Subtasks count */}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CheckCircle2 className="h-3 w-3" />
                {task.subtasks.filter((s: any) => s.status === TaskStatus.DONE).length}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        {/* Drag handle indicator */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
          <GripVertical className="h-5 w-5 text-slate-300" />
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-row gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] overflow-x-auto overflow-y-hidden pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {columns.map((column) => {
          const Icon = column.icon;
          const styles = columnStyles[column.status];
          
          return (
            <div
              key={column.id}
              className={cn(
                'flex-shrink-0 w-[85vw] md:w-72 lg:w-80 snap-center rounded-xl border-2 flex flex-col',
                styles.bg,
                styles.border
              )}
            >
              {/* Column Header */}
              <div className={cn(
                'px-4 py-3 rounded-t-xl border-b flex items-center justify-between',
                styles.headerBg,
                styles.border
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn('p-1.5 rounded-md bg-white/80', styles.icon)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-700">
                    {column.title}
                  </h3>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-white/80 text-slate-600 font-semibold text-xs px-2.5 py-0.5"
                >
                  {column.tasks.length}
                </Badge>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 p-3 overflow-hidden">
                <ScrollArea className="h-full">
                  <SortableContext
                    items={column.tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {column.tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                        <Circle className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">No tasks</p>
                      </div>
                    ) : (
                      column.tasks.map((task) => renderTask(task))
                    )}
                  </SortableContext>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-white rounded-lg border-2 border-blue-300 shadow-xl w-80 opacity-90 rotate-2">
            <div className="p-3 pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-blue-500" />
              <h4 className="font-medium text-sm">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {activeTask.description}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
