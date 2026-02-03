'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TaskStatusConfig, TaskPriorityConfig } from '@/lib/domain/task.utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Tag as TagIcon,
  FolderOpen,
  Check,
} from 'lucide-react';
import { format, isPast, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarViewProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

const priorityColors: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  NONE: '#94a3b8',
};

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: '#64748b',
  [TaskStatus.IN_PROGRESS]: '#3b82f6',
  [TaskStatus.IN_REVIEW]: '#a855f7',
  [TaskStatus.BLOCKED]: '#ef4444',
  [TaskStatus.DONE]: '#10b981',
  [TaskStatus.CANCELLED]: '#94a3b8',
};

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState<any[]>([]);

  useEffect(() => {
    setSelectedDateTasks(getTasksForDate(selectedDate));
  }, [selectedDate, tasks]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), date);
    });
  };

  const completedCount = selectedDateTasks.filter((t) => t.status === TaskStatus.DONE).length;

  // Get all days in current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Custom tile content - show task dots
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dayTasks = getTasksForDate(date);
    if (dayTasks.length === 0) return null;

    const hasOverdue = dayTasks.some(
      (t) => t.status !== TaskStatus.DONE && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
    );

    return (
      <div className="flex flex-col items-center gap-0.5 mt-1">
        <div className="flex gap-0.5 flex-wrap justify-center max-w-[40px]">
          {dayTasks.slice(0, 4).map((task, idx) => (
            <div
              key={idx}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: task.status === TaskStatus.DONE
                  ? '#10b981'
                  : priorityColors[task.priority] || '#64748b'
              }}
            />
          ))}
          {dayTasks.length > 4 && (
            <span className="text-[8px] text-slate-400 leading-none">+{dayTasks.length - 4}</span>
          )}
        </div>
        {hasOverdue && (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <AlertCircle className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    );
  };

  // Custom tile class names
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';

    const dayTasks = getTasksForDate(date);
    const hasTasks = dayTasks.length > 0;
    const hasOverdue = dayTasks.some(
      (t) => t.status !== TaskStatus.DONE && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
    );

    return cn(
      'relative transition-all duration-200 hover:bg-slate-50',
      hasTasks && 'font-medium',
      hasOverdue && 'bg-red-50/50 hover:bg-red-50',
      isSameDay(date, selectedDate) && 'bg-blue-50 hover:bg-blue-100',
      isToday(date) && 'border-2 border-blue-500'
    );
  };

  const renderTask = (task: any) => {
    const isOverdue = task.status !== TaskStatus.DONE && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
    const priorityStyle = TaskPriorityConfig[task.priority];

    return (
      <div
        key={task.id}
        className={cn(
          'group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
          'mb-3',
          isOverdue && 'border-red-200 bg-red-50/30',
          task.status === TaskStatus.DONE && 'opacity-60 bg-slate-50'
        )}
        onClick={() => onTaskClick(task)}
      >
        {/* Priority stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: priorityColors[task.priority] || '#94a3b8' }}
        />

        <div className="p-3 pl-4">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={cn(
              'font-medium text-sm flex-1 leading-relaxed',
              task.status === TaskStatus.DONE && 'line-through text-slate-500'
            )}>
              {task.title}
            </h4>

            {/* Status indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: statusColors[task.status] }}
            />
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: statusColors[task.status] }}
            >
              {TaskStatusConfig[task.status].label}
            </span>

            {/* Priority badge */}
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border"
              style={{
                backgroundColor: `${priorityColors[task.priority]}20`,
                color: priorityColors[task.priority],
                borderColor: `${priorityColors[task.priority]}40`
              }}
            >
              {priorityStyle?.label}
            </span>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.slice(0, 2).map((tagRelation: any) => (
                  <span
                    key={tagRelation.tag.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
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
                  <span className="text-xs text-slate-400">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Project */}
            {task.project && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <FolderOpen className="h-3 w-3" />
                {task.project.name}
              </span>
            )}
          </div>

          {/* Overdue warning */}
          {isOverdue && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full overflow-visible lg:overflow-hidden pb-4 lg:pb-0 font-sans">
      {/* Calendar Section */}
      <div className="w-full bg-white rounded-xl border shadow-sm p-4 md:p-6 flex flex-col shrink-0 lg:flex-1 lg:h-full lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between mb-8 flex-shrink-0 relative z-10 gap-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex w-full">
          <Calendar
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              }
            }}
            value={selectedDate}
            activeStartDate={currentMonth}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate) {
                setCurrentMonth(activeStartDate);
              }
            }}
            tileContent={tileContent}
            tileClassName={tileClassName}
            className="!w-full max-w-none border-0 shadow-none react-calendar-custom text-xl"
            showNavigation={false}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Urgent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-slate-600">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-600">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-600">Low</span>
          </div>
        </div>
      </div>

      {/* Selected Date Tasks Panel */}
      {/* Selected Date Tasks Panel */}
      <div className="w-full lg:w-[450px] bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl flex flex-col shrink-0 h-auto min-h-[400px]">
        <div className="p-4 border-b bg-slate-50/50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-800">
                {format(selectedDate, 'EEEE, MMM d')}
              </h3>
              <p className="text-sm text-slate-500">
                {completedCount} of {selectedDateTasks.length} completed
              </p>
            </div>
            {selectedDateTasks.length > 0 && (
              <div className="text-2xl font-bold text-slate-700">
                {Math.round((completedCount / selectedDateTasks.length) * 100)}%
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4">
          {selectedDateTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-slate-600 font-medium mb-1">No tasks</h4>
              <p className="text-sm text-slate-400">
                No tasks scheduled for this date
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {selectedDateTasks.map((task) => renderTask(task))}
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="font-semibold text-lg text-slate-800">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-sm text-slate-500 mt-2">{selectedTask.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-400">Status</span>
                  <div>
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: statusColors[selectedTask.status], color: 'white' }}
                    >
                      {TaskStatusConfig[selectedTask.status].label}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Priority</span>
                  <div>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `${priorityColors[selectedTask.priority]}20`,
                        color: priorityColors[selectedTask.priority]
                      }}
                    >
                      {TaskPriorityConfig[selectedTask.priority]?.label}
                    </Badge>
                  </div>
                </div>
                {selectedTask.dueDate && (
                  <div className="space-y-1">
                    <span className="text-slate-400">Due Date</span>
                    <div className="font-medium text-slate-700">
                      {format(new Date(selectedTask.dueDate), 'MMMM d, yyyy')}
                    </div>
                  </div>
                )}
                {selectedTask.project && (
                  <div className="space-y-1">
                    <span className="text-slate-400">Project</span>
                    <div className="font-medium text-slate-700">
                      {selectedTask.project.name}
                    </div>
                  </div>
                )}
              </div>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-slate-400">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tagRelation: any) => (
                      <Badge
                        key={tagRelation.tag.id}
                        variant="secondary"
                        style={{
                          backgroundColor: tagRelation.tag.color ? `${tagRelation.tag.color}20` : '#f1f5f9',
                          color: tagRelation.tag.color || '#475569'
                        }}
                      >
                        {tagRelation.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-slate-700">
                    Subtasks ({selectedTask.subtasks.filter((s: any) => s.status === TaskStatus.DONE).length}/{selectedTask.subtasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask: any) => (
                      <div key={subtask.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-50">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: subtask.status === TaskStatus.DONE ? '#10b981' : '#e2e8f0'
                          }}
                        >
                          {subtask.status === TaskStatus.DONE && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={cn(
                          subtask.status === TaskStatus.DONE && 'line-through text-slate-400'
                        )}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
