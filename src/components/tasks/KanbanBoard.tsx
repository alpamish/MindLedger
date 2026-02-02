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
import { TaskStatus } from '@prisma/client';
import { TaskStatusConfig } from '@/lib/domain/task.utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Tag as TagIcon,
  MoreHorizontal,
  Clock,
  AlertCircle,
  Circle,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useTaskStore } from '@/lib/stores/taskStore';

// Map icon names to Lucide components
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

interface KanbanBoardProps {
  tasks: any[];
  onTaskUpdate: (taskId: string, updates: any) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskClick: (task: any) => void;
}

export function KanbanBoard({ tasks, onTaskUpdate, onTaskDelete, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<any>(null);
  const taskStore = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const columns = statusOrder.map((status) => {
    const config = TaskStatusConfig[status];
    const IconComponent = iconMap[config.icon] || Circle;
    return {
      id: status,
      title: config.label,
      color: config.color,
      icon: IconComponent,
      iconString: config.icon,
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

    // Find the column we're over
    const overColumn = columns.find((col) => col.id === overId || col.tasks.some((t) => t.id === overId));
    if (!overColumn) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask || activeTask.status === overColumn.id) return;

    // Update task status
    onTaskUpdate(activeId, { status: overColumn.id });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle reordering within same column
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

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      URGENT: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500',
      NONE: 'bg-gray-500',
    };
    return colorMap[priority] || 'bg-gray-500';
  };

  // Handle task deletion
  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Stop propagation to all listeners
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

  // Handle task status toggle (check/uncheck)
  const handleToggleStatus = async (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    try {
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      await onTaskUpdate(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const renderTask = (task: any) => (
    <Card
      key={task.id}
      className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={() => onTaskClick(task)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className={`font-medium text-sm flex-1 line-clamp-2 ${task.status === TaskStatus.DONE ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </h4>
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: task.color || getPriorityColor(task.priority) }} />
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-2">
          {task.dueDate && (
            <Badge variant="outline" className="text-xs h-6">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(task.dueDate), 'MMM d')}
              {isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE && !isToday(new Date(task.dueDate)) && (
                <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
              )}
            </Badge>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {task.tags.slice(0, 2).map((tagRelation: any) => (
                <Badge
                  key={tagRelation.tag.id}
                  variant="secondary"
                  className="text-xs h-6"
                  style={{ backgroundColor: tagRelation.tag.color || undefined }}
                >
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tagRelation.tag.name}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs h-6">
                  +{task.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mb-2 pt-2 border-t">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {task.subtasks.filter((s: any) => s.status === TaskStatus.DONE).length}/{task.subtasks.length} subtasks
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t mt-2 pointer-events-none" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 pointer-events-auto ${task.status === TaskStatus.DONE ? 'text-muted-foreground' : 'text-green-600'}`}
            onClick={(e) => handleToggleStatus(e, task)}
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 pointer-events-auto"
            onClick={(e) => handleDelete(e, task.id)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const getColumnColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 border-gray-200',
      blue: 'bg-blue-50 border-blue-200',
      purple: 'bg-purple-50 border-purple-200',
      red: 'bg-red-50 border-red-200',
      green: 'bg-green-50 border-green-200',
    };
    return colorMap[color] || 'bg-gray-50 border-gray-200';
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 rounded-lg border-2 p-4 ${getColumnColorClass(column.color)}`}
            >
              <CardHeader className="p-0 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-base">{column.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {column.tasks.length}
                  </Badge>
                </div>
              </CardHeader>

              <ScrollArea className="h-[calc(100vh-300px)]">
                <SortableContext
                  items={column.tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.tasks.map((task) => renderTask(task))}
                </SortableContext>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="w-80 cursor-grabbing shadow-lg">
            <CardContent className="p-3">
              <h4 className="font-medium text-sm mb-2">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{activeTask.description}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
