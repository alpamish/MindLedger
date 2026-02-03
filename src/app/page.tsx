'use client';

// App version for cache busting - v3
console.log('TodoApp loading - v3');

import { useEffect, useState } from 'react';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useListStore } from '@/lib/stores/listStore';
import { useTagStore } from '@/lib/stores/tagStore';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TaskStatusConfig, TaskPriorityConfig } from '@/lib/domain/task.utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StudyTracker } from '@/components/study/StudyTracker';
import { CalendarView } from '@/components/tasks/CalendarView';
import { Notes } from '@/components/notes/Notes';
import {
  Plus,
  Inbox,
  Calendar,
  CalendarDays,
  AlertCircle,
  Tag as TagIcon,
  LayoutGrid,
  List,
  Search,
  MoreHorizontal,
  ChevronRight,
  FolderOpen,
  CheckSquare,
  Clock,
  Archive,
  Trash2,
  Edit,
  Copy,
  Filter,
  X,
  BookOpen,
  FileText,
  Menu,
} from 'lucide-react';
import { format, isToday, isPast, isFuture, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TodoApp() {
  // Stores
  const taskStore = useTaskStore();
  const projectStore = useProjectStore();
  const listStore = useListStore();
  const tagStore = useTagStore();

  // Local state
  const [activeTab, setActiveTab] = useState<'tasks' | 'study' | 'notes'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('none');
  const [newTaskListId, setNewTaskListId] = useState('none');

  // Initialize data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const workspaceResponse = await fetch('/api/workspace/init');
        if (workspaceResponse.ok) {
          await workspaceResponse.json();
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      }

      await Promise.all([
        taskStore.fetchTasks(),
        projectStore.fetchProjects(),
        listStore.fetchLists(),
        tagStore.fetchTags(),
      ]);
    };

    initializeApp();
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle create task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    await taskStore.createTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
      projectId: newTaskProjectId && newTaskProjectId !== 'none' ? newTaskProjectId : undefined,
      listId: newTaskListId && newTaskListId !== 'none' ? newTaskListId : undefined,
    });

    // Reset form
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority(TaskPriority.MEDIUM);
    setNewTaskDueDate('');
    setNewTaskProjectId('none');
    setNewTaskListId('none');
    setIsCreateDialogOpen(false);
  };

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, completed: boolean) => {
    await taskStore.updateTaskData(taskId, {
      status: completed ? TaskStatus.DONE : TaskStatus.TODO,
      isArchived: completed,
    });
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    await taskStore.deleteTask(taskId);
  };

  // Handle select task
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const filteredTasks = getFilteredTasks();
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  // Toggle task expansion for subtasks
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Handle create subtask
  const handleCreateSubtask = async (parentId: string) => {
    const title = subtaskInputs[parentId]?.trim();
    if (!title) return;

    await taskStore.createTask({
      title,
      parentId,
      projectId: taskStore.getTaskById(parentId)?.projectId,
      listId: taskStore.getTaskById(parentId)?.listId,
    });

    setSubtaskInputs((prev) => ({ ...prev, [parentId]: '' }));
    await taskStore.fetchTasks();
  };

  // Handle subtask status change
  const handleSubtaskStatusChange = async (subtaskId: string, completed: boolean) => {
    await taskStore.updateTaskData(subtaskId, {
      status: completed ? TaskStatus.DONE : TaskStatus.TODO,
    });
  };

  // Handle delete subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    await taskStore.deleteTask(subtaskId);
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    const tasks = taskStore.getFilteredTasks();

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }

    return tasks;
  };

  // Get task priority color
  const getPriorityColor = (priority: TaskPriority) => {
    const config = TaskPriorityConfig[priority];
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      gray: 'bg-gray-500',
    };
    return colorMap[config.color] || 'bg-gray-500';
  };

  // Get status color
  const getStatusColor = (status: TaskStatus) => {
    const config = TaskStatusConfig[status];
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500',
      green: 'bg-green-500',
    };
    return colorMap[config.color] || 'bg-gray-500';
  };

  // Render task card
  const renderTaskCard = (task: any) => (
    <Card
      key={task.id}
      className={`hover:shadow-md transition-shadow ${selectedTaskIds.includes(task.id) ? 'ring-2 ring-primary' : ''
        }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === TaskStatus.DONE}
            onCheckedChange={(checked) => handleTaskStatusChange(task.id, checked as boolean)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium truncate ${task.status === TaskStatus.DONE ? 'line-through text-muted-foreground' : ''
                  }`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(task.dueDate), 'MMM d')}
                  {isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE && (
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
                      className="text-xs"
                      style={{ backgroundColor: tagRelation.tag.color || undefined }}
                    >
                      {tagRelation.tag.name}
                    </Badge>
                  ))}
                  {task.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{task.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {task.subtasks && task.subtasks.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer"
                  onClick={() => toggleTaskExpansion(task.id)}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  {task.subtasks.filter((s: any) => s.status === TaskStatus.DONE).length}/
                  {task.subtasks.length}
                  <ChevronRight
                    className={`h-3 w-3 ml-1 transition-transform ${expandedTasks.has(task.id) ? 'rotate-90' : ''
                      }`}
                  />
                </Badge>
              )}

              {(!task.subtasks || task.subtasks.length === 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => toggleTaskExpansion(task.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add subtask
                </Button>
              )}
            </div>

            {/* Subtasks Section */}
            {expandedTasks.has(task.id) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {/* Existing subtasks */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-2">
                    {task.subtasks.map((subtask: any) => (
                      <div key={subtask.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={subtask.status === TaskStatus.DONE}
                          onCheckedChange={(checked) =>
                            handleSubtaskStatusChange(subtask.id, checked as boolean)
                          }
                          className="h-4 w-4"
                        />
                        <span
                          className={`flex-1 ${subtask.status === TaskStatus.DONE
                            ? 'line-through text-muted-foreground'
                            : ''
                            }`}
                        >
                          {subtask.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new subtask */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={subtaskInputs[task.id] || ''}
                    onChange={(e) =>
                      setSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubtask(task.id);
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleCreateSubtask(task.id)}
                    disabled={!subtaskInputs[task.id]?.trim()}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {task.project && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                <span>{task.project.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSidebar = () => (
    <div className={cn(
      "border-r bg-background flex flex-col transition-all duration-300",
      isMobile
        ? (isSidebarOpen ? "fixed inset-0 z-50 w-full h-full" : "hidden")
        : "w-64 h-full relative"
    )}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            className="flex-1"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="space-y-1">
            <Button
              variant={taskStore.currentView === 'inbox' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('inbox')}
            >
              <Inbox className="h-4 w-4 mr-2" />
              Inbox
              <Badge variant="secondary" className="ml-auto">
                {taskStore.getFilteredTasks().filter(
                  (t) => t.status === TaskStatus.TODO && !t.dueDate
                ).length}
              </Badge>
            </Button>

            <Button
              variant={taskStore.currentView === 'today' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('today')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Today
              <Badge variant="secondary" className="ml-auto">
                {taskStore.getFilteredTasks().filter((t) =>
                  t.dueDate && isToday(new Date(t.dueDate))
                ).length}
              </Badge>
            </Button>

            <Button
              variant={taskStore.currentView === 'upcoming' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('upcoming')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Upcoming
            </Button>

            <Button
              variant={taskStore.currentView === 'overdue' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('overdue')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Overdue
              <Badge variant="destructive" className="ml-auto">
                {taskStore.getFilteredTasks().filter((t) =>
                  t.dueDate && isPast(new Date(t.dueDate)) && t.status !== TaskStatus.DONE
                ).length}
              </Badge>
            </Button>

            <Button
              variant={taskStore.currentView === 'priority' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('priority')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              High Priority
            </Button>

            <Button
              variant={taskStore.currentView === 'tags' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('tags')}
            >
              <TagIcon className="h-4 w-4 mr-2" />
              Tags
            </Button>

            <Button
              variant={taskStore.currentView === 'archive' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => taskStore.setCurrentView('archive')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
              <Badge variant="secondary" className="ml-auto">
                {Array.from(taskStore.tasks.values()).filter((t) => t.isArchived).length}
              </Badge>
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Projects
            </div>
            {Array.from(projectStore.projects.values()).map((project) => (
              <Button
                key={project.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  taskStore.setFilters({ projectId: [project.id] });
                  taskStore.setCurrentView('all');
                }}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {project.name}
              </Button>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Tags
            </div>
            {Array.from(tagStore.tags.values()).map((tag) => (
              <Button
                key={tag.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  taskStore.setFilters({ tagIds: [tag.id] });
                  taskStore.setCurrentView('all');
                }}
              >
                <TagIcon className="h-4 w-4 mr-2" />
                {tag.name}
                {tag.color && (
                  <div
                    className="w-2 h-2 rounded-full ml-auto"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  const filteredTasks = getFilteredTasks();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Tabs */}
        <div className="border-b bg-background sticky top-0 z-30 w-full">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'study' | 'notes')} className="w-full">
            <div className="p-4 bg-background">
              <TabsList className="w-auto">
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="study" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Study Tracker
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tasks Tab Content - Now includes sidebar */}
            <TabsContent value="tasks" className="mt-0">
              <div className="flex flex-col md:flex-row h-full">
                {/* Sidebar inside Tasks tab */}
                {renderSidebar()}

                {/* Tasks content area */}
                <div className="flex-1 flex flex-col overflow-visible md:overflow-hidden">
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(true)}
                            className={cn(isSidebarOpen && "hidden")}
                          >
                            <Menu className="h-5 w-5" />
                          </Button>
                        )}
                        <div>
                          <h1 className="text-2xl font-bold capitalize">
                            {taskStore.currentView === 'all' ? 'All Tasks' : taskStore.currentView}
                          </h1>
                          <p className="text-sm text-muted-foreground">
                            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                          />
                        </div>

                        <div className="flex items-center border rounded-md">
                          <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="rounded-none"
                            onClick={() => setViewMode('list')}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="rounded-none"
                            onClick={() => setViewMode('grid')}
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="rounded-l-none"
                            onClick={() => setViewMode('calendar')}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {selectedTaskIds.length > 0 && (
                      <div className="mt-4 p-2 bg-muted rounded-md flex items-center gap-2">
                        <span className="text-sm">
                          {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds([])}>
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Task Content */}
                  {viewMode === 'calendar' ? (
                    <div className="flex-1">
                      {taskStore.isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-muted-foreground">Loading...</div>
                        </div>
                      ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="text-muted-foreground mb-4">
                            {searchQuery ? 'No tasks match your search' : 'No tasks in this view'}
                          </div>
                          {!searchQuery && (
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Task
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="p-4">
                          <CalendarView tasks={filteredTasks} onTaskClick={(task) => console.log('Task clicked:', task)} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        {taskStore.isLoading ? (
                          <div className="flex items-center justify-center h-64">
                            <div className="text-muted-foreground">Loading...</div>
                          </div>
                        ) : filteredTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="text-muted-foreground mb-4">
                              {searchQuery ? 'No tasks match your search' : 'No tasks in this view'}
                            </div>
                            {!searchQuery && (
                              <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Task
                              </Button>
                            )}
                          </div>
                        ) : viewMode === 'list' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-4 py-2">
                              <Checkbox
                                checked={selectedTaskIds.length === filteredTasks.length}
                                onCheckedChange={handleSelectAll}
                              />
                              <span className="text-sm text-muted-foreground">Select all</span>
                            </div>
                            {filteredTasks.map((task) => renderTaskCard(task))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTasks.map((task) => renderTaskCard(task))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Study Tab Content - No header needed, StudyTracker has its own */}
            <TabsContent value="study" className="mt-0 h-[calc(100vh-80px)]" />
          </Tabs>
        </div>

        {/* Study Tracker - Only show in study tab */}
        {activeTab === 'study' && (
          <ScrollArea className="flex-1">
            <div className="p-6">
              <StudyTracker />
            </div>
          </ScrollArea>
        )}

        {/* Notes View - Only show in notes tab */}
        {activeTab === 'notes' && (
          <div className="flex-1 overflow-hidden">
            <div className="p-6 h-full">
              <Notes />
            </div>
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim()) {
                    handleCreateTask();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TaskPriorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={newTaskProjectId} onValueChange={setNewTaskProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {Array.from(projectStore.projects.values()).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="list">List</Label>
                <Select value={newTaskListId} onValueChange={setNewTaskListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No list</SelectItem>
                    {Array.from(listStore.lists.values()).map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
