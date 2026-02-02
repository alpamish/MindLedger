'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { TaskStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle2, Circle, Clock, Eye, XCircle, Ban } from 'lucide-react';
import { format, isPast, isToday, isSameDay } from 'date-fns';
import { TaskStatusConfig } from '@/lib/domain/task.utils';

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

interface CalendarViewProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), date);
    });
  };

  // Count tasks for each day
  const getDayTaskCount = (date: Date) => {
    return getTasksForDate(date).length;
  };

  // Check if day has overdue tasks
  const hasOverdueTasks = (date: Date) => {
    return getTasksForDate(date).some(
      (t) => t.status !== TaskStatus.DONE && t.dueDate && isPast(new Date(t.dueDate))
    );
  };

  // Get task status color
  const getTaskStatusColor = (task: any) => {
    if (task.status === TaskStatus.DONE) return 'text-green-500';
    if (task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) {
      return 'text-red-500';
    }
    if (task.status === TaskStatus.IN_PROGRESS) return 'text-blue-500';
    return 'text-gray-500';
  };

  // Create modifiers for days with tasks
  const modifiers = {
    hasTasks: tasks.filter(t => t.dueDate).map(t => new Date(t.dueDate)),
    hasOverdue: tasks
      .filter(t => t.dueDate && t.status !== TaskStatus.DONE && isPast(new Date(t.dueDate)))
      .map(t => new Date(t.dueDate)),
  };

  // Custom modifiers class names
  const modifiersClassNames = {
    hasTasks: 'bg-primary/10 font-semibold',
    hasOverdue: 'bg-red-100 dark:bg-red-900/30 font-semibold',
  };

  // Get task count for selected date
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const selectedDateTaskCount = selectedDateTasks.length;
  const completedCount = selectedDateTasks.filter((t) => t.status === TaskStatus.DONE).length;

  // Custom day content to show task count
  const DayContent = (props: any) => {
    const date = props.date;
    const taskCount = getDayTaskCount(date);
    const isOverdue = hasOverdueTasks(date);

    return (
      <div className="relative">
        <span>{props.formattedDate}</span>
        {taskCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-4 h-4 text-[10px] flex items-center justify-center rounded-full ${
            isOverdue ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
          }`}>
            {taskCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Calendar */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            components={{
              DayContent,
            }}
            className="rounded-md border"
            styles={{
              months: { display: 'flex', flexDirection: 'column' },
              month: { width: '100%' },
              caption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem' },
              table: { width: '100%', borderCollapse: 'collapse' },
              head_row: { display: 'flex', width: '100%' },
              head_cell: { width: '14.28%', padding: '0.5rem', fontWeight: 'bold', textAlign: 'center' },
              row: { display: 'flex', width: '100%', marginBottom: '0.25rem' },
              cell: { width: '14.28%', padding: '0.25rem' },
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Date Tasks */}
      <Card className="w-96">
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </CardTitle>
          {selectedDate && (
            <div className="text-sm text-muted-foreground">
              {completedCount} of {selectedDateTaskCount} tasks completed
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => {
                  const statusConfig = TaskStatusConfig[task.status];
                  const isOverdue = task.status !== TaskStatus.DONE && task.dueDate && isPast(new Date(task.dueDate));
                  const StatusIcon = iconMap[statusConfig.icon] || Circle;

                  return (
                    <Card
                      key={task.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue ? 'border-red-200 bg-red-50/50' : ''
                      }`}
                      onClick={() => onTaskClick(task)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <StatusIcon className={`h-4 w-4 mt-0.5 ${getTaskStatusColor(task)}`} />
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm ${task.status === TaskStatus.DONE ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs h-5">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {task.status === TaskStatus.DONE && (
                            <Badge variant="secondary" className="text-xs h-5 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {task.project && (
                            <Badge variant="outline" className="text-xs h-5">
                              {task.project.name}
                            </Badge>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1">
                              {task.tags.slice(0, 2).map((tagRelation: any) => (
                                <Badge
                                  key={tagRelation.tag.id}
                                  variant="secondary"
                                  className="text-xs h-5"
                                  style={{ backgroundColor: tagRelation.tag.color || undefined }}
                                >
                                  {tagRelation.tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground mt-2">{selectedTask.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant="secondary">{TaskStatusConfig[selectedTask.status].label}</Badge>
                </div>
                {selectedTask.dueDate && (
                  <div>
                    <span className="text-muted-foreground">Due:</span>{' '}
                    {format(new Date(selectedTask.dueDate), 'MMMM d, yyyy')}
                  </div>
                )}
                {selectedTask.project && (
                  <div>
                    <span className="text-muted-foreground">Project:</span> {selectedTask.project.name}
                  </div>
                )}
                {selectedTask.list && (
                  <div>
                    <span className="text-muted-foreground">List:</span> {selectedTask.list.name}
                  </div>
                )}
              </div>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  <div className="flex gap-2 mt-2">
                    {selectedTask.tags.map((tagRelation: any) => (
                      <Badge
                        key={tagRelation.tag.id}
                        variant="secondary"
                        style={{ backgroundColor: tagRelation.tag.color || undefined }}
                      >
                        {tagRelation.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Subtasks</h4>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask: any) => (
                      <div key={subtask.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            subtask.status === TaskStatus.DONE ? 'text-green-500' : 'text-gray-300'
                          }`}
                        />
                        <span
                          className={
                            subtask.status === TaskStatus.DONE ? 'line-through text-muted-foreground' : ''
                          }
                        >
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
