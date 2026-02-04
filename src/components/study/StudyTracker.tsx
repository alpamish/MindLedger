'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useStudyStore, StudyCategoryConfig } from '@/lib/stores/studyStore';
import { StudyCategory } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  BookOpen,
  Clock,
  Flame,
  TrendingUp,
  BarChart3,
  Pause,
  Play,
  History,
  Eye,
  CheckCircle,
  Archive,
  Activity,
  Trash2,
  Search,
  X,
} from 'lucide-react';

export function StudyTracker() {
  const studyStore = useStudyStore();

  // Local state
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const [isViewSessionsOpen, setIsViewSessionsOpen] = useState(false);
  const [selectedGoalForSession, setSelectedGoalForSession] = useState<string | null>(null);
  const [isViewGoalSessionsOpen, setIsViewGoalSessionsOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<StudyCategory>(StudyCategory.OTHER);
  const [newGoalTargetValue, setNewGoalTargetValue] = useState('');
  const [newGoalTargetUnit, setNewGoalTargetUnit] = useState('hours');

  // Session form state
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionValue, setSessionValue] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionMood, setSessionMood] = useState('');

  // Validation errors
  const [durationError, setDurationError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);

  // Helper function to calculate remaining value for a goal
  const getRemainingValue = (goalId: string | null, goalsList: any[]): number | null => {
    if (!goalId) return null;
    const goal = goalsList.find(g => g.id === goalId);
    if (!goal || !goal.targetValue) return null;
    const currentValue = goal.targetUnit === 'hours'
      ? (goal.progress?.totalHours || 0)
      : (goal.progress?.totalValue || 0);
    return Math.max(0, goal.targetValue - currentValue);
  };

  // Validate duration input
  const validateDuration = (value: string): boolean => {
    if (!value) {
      setDurationError(null);
      return true;
    }
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) {
      setDurationError('Duration must be at least 1 minute');
      return false;
    }
    if (num > 1440) {
      setDurationError('Duration cannot exceed 24 hours (1440 minutes)');
      return false;
    }
    setDurationError(null);
    return true;
  };

  // Validate value input
  const validateValue = (value: string, goalId: string | null, goalsList: any[]): boolean => {
    if (!value || value === '') {
      setValueError(null);
      return true;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setValueError('Please enter a valid number');
      return false;
    }
    if (num < 0) {
      setValueError('Value cannot be negative');
      return false;
    }
    setValueError(null);
    return true;
  };

  // View sessions pagination
  const [sessionsPage, setSessionsPage] = useState(1);
  const sessionsPerPage = 20;

  // Archive view state
  const [isViewArchiveOpen, setIsViewArchiveOpen] = useState(false);
  const [archivePage, setArchivePage] = useState(1);
  const goalsPerPage = 20;

  // Delete goal state
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Initialize
  useEffect(() => {
    studyStore.fetchGoals();
    studyStore.fetchStatistics();
    studyStore.fetchSessions();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Reset sessions page when dialog closes
  useEffect(() => {
    if (!isViewSessionsOpen) {
      setSessionsPage(1);
    }
  }, [isViewSessionsOpen]);

  // Reset sessions page when goal sessions dialog closes
  useEffect(() => {
    if (!isViewGoalSessionsOpen) {
      setSessionsPage(1);
      setSelectedGoalId(null);
    }
  }, [isViewGoalSessionsOpen]);

  // Reset archive page when archive dialog closes
  useEffect(() => {
    if (!isViewArchiveOpen) {
      setArchivePage(1);
    }
  }, [isViewArchiveOpen]);

  // Reset validation errors when log session dialog closes
  useEffect(() => {
    if (!isLogSessionOpen) {
      setDurationError(null);
      setValueError(null);
    }
  }, [isLogSessionOpen]);

  // Auto-calculate value from duration for hours-based goals
  useEffect(() => {
    const selectedGoal = studyStore.goals.get(selectedGoalForSession || '');
    if (selectedGoal?.targetUnit === 'hours' && sessionDuration) {
      const duration = parseInt(sessionDuration);
      if (!isNaN(duration) && duration > 0) {
        setSessionValue((duration / 60).toFixed(2));
      }
    }
  }, [sessionDuration, selectedGoalForSession]);

  // Handle create goal
  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalTargetValue.trim()) return;

    await studyStore.createGoal({
      title: newGoalTitle.trim(),
      description: newGoalDescription.trim() || undefined,
      category: newGoalCategory,
      targetValue: parseFloat(newGoalTargetValue),
      targetUnit: newGoalTargetUnit,
    });

    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalCategory(StudyCategory.OTHER);
    setNewGoalTargetValue('');
    setNewGoalTargetUnit('hours');
    setIsCreateGoalOpen(false);
  };

  // Handle delete goal
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    await studyStore.deleteGoal(goalToDelete);
    await studyStore.fetchStatistics();
    setGoalToDelete(null);
  };

  // Handle log session
  const handleLogSession = async () => {
    if (!selectedGoalForSession || (!sessionDuration && timerSeconds === 0)) return;

    // Calculate duration - if timer was used, ensure at least 1 minute
    const duration = timerSeconds > 0
      ? Math.max(1, Math.floor(timerSeconds / 60))
      : parseInt(sessionDuration);

    // Validate duration
    if (isNaN(duration) || duration <= 0) {
      console.error('Invalid duration:', duration);
      return;
    }
    if (duration > 1440) {
      setDurationError('Duration cannot exceed 24 hours (1440 minutes)');
      return;
    }

    // Validate value if provided, or auto-calculate for hours-based goals
    let value: number | undefined = undefined;
    const selectedGoal = goals.find(g => g.id === selectedGoalForSession);
    if (selectedGoal?.targetUnit === 'hours') {
      // Auto-calculate value from duration (convert minutes to hours)
      value = duration / 60;
    } else if (sessionValue && sessionValue.trim() !== '') {
      value = parseFloat(sessionValue);
      if (isNaN(value)) {
        setValueError('Please enter a valid number');
        return;
      }
    }

    await studyStore.logSession({
      goalId: selectedGoalForSession,
      duration,
      value,
      notes: sessionNotes.trim() || undefined,
      mood: sessionMood || undefined,
    });

    // Reset form and validation
    setSessionDuration('');
    setSessionValue('');
    setSessionNotes('');
    setSessionMood('');
    setDurationError(null);
    setValueError(null);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setSelectedGoalForSession(null);
    setIsLogSessionOpen(false);
  };

  // Handle timer
  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format numbers - shows whole numbers when possible
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '0';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const goals = Array.from(studyStore.goals.values());
  const statistics = studyStore.statistics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Track Your Goals</h2>
          <p className="text-muted-foreground">Track your progress and achieve your learning goals</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateGoalOpen} onOpenChange={setIsCreateGoalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Title *</Label>
                  <Input
                    id="goal-title"
                    placeholder="e.g., Learn Spanish"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-category">Category</Label>
                  <Select value={newGoalCategory} onValueChange={(v) => setNewGoalCategory(v as StudyCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(StudyCategoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-description">Description</Label>
                  <Textarea
                    id="goal-description"
                    placeholder="What do you want to achieve?"
                    value={newGoalDescription}
                    onChange={(e) => setNewGoalDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-value">Target Value *</Label>
                    <Input
                      id="target-value"
                      type="number"
                      placeholder="100"
                      min="1"
                      value={newGoalTargetValue}
                      onChange={(e) => setNewGoalTargetValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-unit">Unit</Label>
                    <Select value={newGoalTargetUnit} onValueChange={setNewGoalTargetUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="pages">Pages</SelectItem>
                        <SelectItem value="lessons">Lessons</SelectItem>
                        <SelectItem value="chapters">Chapters</SelectItem>
                        <SelectItem value="words">Words</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateGoalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGoal} disabled={!newGoalTitle.trim() || !newGoalTargetValue.trim()}>
                  Create Goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isLogSessionOpen} onOpenChange={setIsLogSessionOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={goals.filter((goal) => (goal.progress?.progressPercentage || 0) < 100).length === 0}
              >
                {goals.filter((goal) => (goal.progress?.progressPercentage || 0) < 100).length === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    All Goals Completed
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Log Session
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Study Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="session-goal">Goal *</Label>
                  <Select
                    value={selectedGoalForSession || ''}
                    onValueChange={(value) => {
                      setSelectedGoalForSession(value);
                      // Re-validate value when goal changes
                      if (sessionValue) {
                        validateValue(sessionValue, value, goals);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.filter((goal) => {
                        const progress = goal.progress || {};
                        return (progress.progressPercentage || 0) < 100;
                      }).map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {StudyCategoryConfig[goal.category]?.icon} {goal.title}
                        </SelectItem>
                      ))}
                      {goals.filter((goal) => {
                        const progress = goal.progress || {};
                        return (progress.progressPercentage || 0) < 100;
                      }).length === 0 && (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            All goals completed
                          </div>
                        )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timer */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 p-4 rounded-lg text-center ${Math.floor(timerSeconds / 60) > 1440 ? 'bg-red-100' : 'bg-muted'}`}>
                      <div className={`text-3xl font-mono font-bold ${Math.floor(timerSeconds / 60) > 1440 ? 'text-red-600' : ''}`}>
                        {formatTimer(timerSeconds)}
                      </div>
                      {isTimerRunning && (
                        <div className="text-xs text-muted-foreground mt-1">Recording...</div>
                      )}
                    </div>
                    <Button
                      variant={isTimerRunning ? "destructive" : "default"}
                      size="icon"
                      className="h-16 w-16"
                      onClick={toggleTimer}
                    >
                      {isTimerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                  </div>
                  {Math.floor(timerSeconds / 60) > 1440 && (
                    <p className="text-xs text-red-500">Timer exceeds 24 hours maximum limit. Please stop and log session.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-duration">Or enter duration manually (minutes)</Label>
                  <Input
                    id="manual-duration"
                    type="number"
                    placeholder="30"
                    min="1"
                    max="1440"
                    value={sessionDuration}
                    onChange={(e) => {
                      setSessionDuration(e.target.value);
                      validateDuration(e.target.value);
                    }}
                    disabled={timerSeconds > 0}
                    className={durationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {durationError ? (
                    <p className="text-xs text-red-500">{durationError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Maximum: 24 hours (1440 minutes)</p>
                  )}
                </div>

                {selectedGoalForSession && (
                  <div className="space-y-2">
                    <Label htmlFor="session-value">
                      {goals.find(g => g.id === selectedGoalForSession)?.targetUnit === 'hours'
                        ? 'Value Completed (auto-calculated from duration)'
                        : `Value Completed (${goals.find(g => g.id === selectedGoalForSession)?.targetUnit || 'pages'})`}
                    </Label>
                    <Input
                      id="session-value"
                      type="number"
                      placeholder="5"
                      min="0"
                      max={goals.find(g => g.id === selectedGoalForSession)?.targetValue || undefined}
                      value={sessionValue}
                      onChange={(e) => {
                        setSessionValue(e.target.value);
                        validateValue(e.target.value, selectedGoalForSession, goals);
                      }}
                      disabled={goals.find(g => g.id === selectedGoalForSession)?.targetUnit === 'hours'}
                      className={valueError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {valueError ? (
                      <p className="text-xs text-red-500">{valueError}</p>
                    ) : goals.find(g => g.id === selectedGoalForSession)?.targetUnit === 'hours' ? (
                      <p className="text-xs text-muted-foreground">
                        Value is automatically calculated from session duration
                      </p>
                    ) : goals.find(g => g.id === selectedGoalForSession)?.targetValue ? (
                      <p className="text-xs text-muted-foreground">
                        Remaining: {formatNumber(getRemainingValue(selectedGoalForSession, goals))} {goals.find(g => g.id === selectedGoalForSession)?.targetUnit}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="session-notes">Notes</Label>
                  <Textarea
                    id="session-notes"
                    placeholder="What did you study?"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-mood">How did it feel?</Label>
                  <Select value={sessionMood || ''} onValueChange={setSessionMood}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="great">😄 Great</SelectItem>
                      <SelectItem value="good">🙂 Good</SelectItem>
                      <SelectItem value="okay">😐 Okay</SelectItem>
                      <SelectItem value="difficult">😓 Difficult</SelectItem>
                      <SelectItem value="tiring">😴 Tiring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLogSessionOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLogSession}
                  disabled={
                    !selectedGoalForSession ||
                    (!sessionDuration && timerSeconds === 0) ||
                    durationError !== null ||
                    valueError !== null ||
                    Math.floor(timerSeconds / 60) > 1440 ||
                    (selectedGoalForSession ? (studyStore.getGoalById(selectedGoalForSession)?.progress?.progressPercentage || 0) >= 100 : false)
                  }
                >
                  Log Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isViewSessionsOpen} onOpenChange={setIsViewSessionsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Sessions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[50rem] max-h-[83vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Recorded Study Sessions</DialogTitle>
              </DialogHeader>
              <div className="py-4 flex flex-col" style={{ maxHeight: '63vh' }}>
                {(() => {
                  const uncompletedSessions = Array.from(studyStore.sessions.values())
                    .filter((session) => {
                      const goal = studyStore.getGoalById(session.goalId);
                      return goal && (goal.progress?.progressPercentage || 0) < 100;
                    });

                  if (studyStore.sessions.size === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4" />
                        <p>No recorded sessions yet.</p>
                        <p className="text-sm">Start logging your study sessions to track your progress!</p>
                      </div>
                    );
                  }

                  if (uncompletedSessions.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4" />
                        <p>No sessions from active goals.</p>
                        <p className="text-sm">All your sessions belong to completed goals!</p>
                      </div>
                    );
                  }

                  const sortedSessions = uncompletedSessions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const totalPages = Math.ceil(sortedSessions.length / sessionsPerPage);
                  const startIndex = (sessionsPage - 1) * sessionsPerPage;
                  const paginatedSessions = sortedSessions.slice(startIndex, startIndex + sessionsPerPage);

                  return (
                    <>
                      <ScrollArea className="flex-1 overflow-y-auto pr-4">
                        <div className="space-y-3 pb-4">
                          {paginatedSessions.map((session) => {
                            const goal = studyStore.getGoalById(session.goalId);
                            return (
                              <div key={session.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-start gap-3 flex-1">
                                  <span className="text-xl">{goal ? StudyCategoryConfig[goal.category]?.icon : '📚'}</span>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{goal?.title || 'Unknown Goal'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(session.date), 'MMM d, yyyy')} • {session.duration} minutes
                                    </p>
                                    {session.notes && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.notes}</p>
                                    )}
                                    {session.mood && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs font-medium text-muted-foreground">Mood:</span>
                                        <span className="text-xs">{session.mood === 'great' ? '😄 Great' : session.mood === 'good' ? '🙂 Good' : session.mood === 'okay' ? '😐 Okay' : session.mood === 'difficult' ? '😓 Difficult' : '😴 Tiring'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <p className="text-sm font-medium">
                                    {Math.floor(session.duration / 60)}h {session.duration % 60}m
                                  </p>
                                  {session.value && (
                                    <p className="text-xs text-muted-foreground">{Number(session.value).toFixed(2)} {goal?.targetUnit || 'items'}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSessionsPage((prev) => Math.max(1, prev - 1))}
                            disabled={sessionsPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {sessionsPage} of {totalPages} ({sortedSessions.length} sessions)
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSessionsPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={sessionsPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>

          {/* View Archived Goals Dialog */}
          <Dialog open={isViewArchiveOpen} onOpenChange={setIsViewArchiveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Archived Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[45%] max-h-[83vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Archived Goals</DialogTitle>
              </DialogHeader>
              <div className="py-4 flex flex-col" style={{ maxHeight: '63vh' }}>
                {(() => {
                  const archivedGoals = goals.filter((goal) => !goal.isActive);
                  const totalPages = Math.ceil(archivedGoals.length / goalsPerPage);
                  const startIndex = (archivePage - 1) * goalsPerPage;
                  const paginatedGoals = archivedGoals.slice(startIndex, startIndex + goalsPerPage);

                  if (archivedGoals.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="h-12 w-12 mx-auto mb-4" />
                        <p>No archived goals yet.</p>
                        <p className="text-sm">Complete goals to see them here!</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <ScrollArea className="flex-1 overflow-y-auto pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pb-4">
                          {paginatedGoals.map((goal) => {
                            const config = StudyCategoryConfig[goal.category];
                            const progress = goal.progress || {};
                            return (
                              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">{config?.icon}</span>
                                      <div>
                                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                                        <CardDescription className="text-xs">{config?.label}</CardDescription>
                                      </div>
                                    </div>
                                    <Badge variant="secondary">
                                      Archived
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Progress */}
                                  {goal.targetValue && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium text-green-600">
                                          Completed
                                        </span>
                                      </div>
                                      <Progress value={100} className="h-2" />
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{goal.targetUnit === 'hours' ? formatNumber(progress.totalHours) : formatNumber(progress.totalValue)} / {goal.targetValue} {goal.targetUnit}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Stats */}
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div
                                      className="bg-muted rounded-lg p-2 cursor-pointer hover:bg-muted/70 transition-colors"
                                      onClick={() => {
                                        setSelectedGoalId(goal.id);
                                        setIsViewGoalSessionsOpen(true);
                                      }}
                                    >
                                      <div className="text-lg font-bold">{progress.sessionCount || 0}</div>
                                      <div className="text-xs text-muted-foreground">Sessions</div>
                                    </div>
                                    <div className="bg-muted rounded-lg p-2">
                                      <div className="text-lg font-bold">{formatNumber(progress.totalHours) || 0}h</div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                    <div className="bg-muted rounded-lg p-2">
                                      <div className="text-lg font-bold">{progress.currentStreak || 0}🔥</div>
                                      <div className="text-xs text-muted-foreground">Streak</div>
                                    </div>
                                  </div>

                                  {/* Completed Status */}
                                  <div className="w-full p-2 bg-green-50 rounded-lg text-center">
                                    <div className="text-sm font-medium text-green-700">
                                      🎉 Goal Completed
                                    </div>
                                    <p className="text-xs text-green-600 mt-1">
                                      {goal.completedAt ? format(new Date(goal.completedAt), 'MMM d, yyyy') : ''}
                                    </p>
                                  </div>

                                  {/* Delete Button */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-muted-foreground hover:text-red-500"
                                    onClick={() => setGoalToDelete(goal.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Goal
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setArchivePage((prev) => Math.max(1, prev - 1))}
                            disabled={archivePage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {archivePage} of {totalPages} ({archivedGoals.length} archived)
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setArchivePage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={archivePage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
          {/* Goal Specific Sessions Dialog */}
          <Dialog open={isViewGoalSessionsOpen} onOpenChange={setIsViewGoalSessionsOpen}>
            <DialogContent className="max-w-[50rem] max-h-[83vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedGoalId ? studyStore.getGoalById(selectedGoalId)?.title : 'Goal'} - Sessions
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 flex flex-col" style={{ maxHeight: '63vh' }}>
                {!selectedGoalId || studyStore.sessions.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>No sessions found for this goal.</p>
                  </div>
                ) : (
                  <>
                    {/* Calculate paginated sessions for selected goal */}
                    {(() => {
                      const selectedGoal = studyStore.getGoalById(selectedGoalId);
                      const goalSessions = Array.from(studyStore.sessions.values())
                        .filter((session) => session.goalId === selectedGoalId)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      const totalPages = Math.ceil(goalSessions.length / sessionsPerPage);
                      const startIndex = (sessionsPage - 1) * sessionsPerPage;
                      const paginatedSessions = goalSessions.slice(startIndex, startIndex + sessionsPerPage);

                      return (
                        <>
                          <ScrollArea className="flex-1 overflow-y-auto pr-4">
                            <div className="space-y-3 pb-4">
                              {paginatedSessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{selectedGoal ? StudyCategoryConfig[selectedGoal.category]?.icon : '📚'}</span>
                                    <div>
                                      <p className="font-medium text-sm">{selectedGoal?.title || 'Unknown Goal'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(session.date), 'MMM d, yyyy')} • {(session.duration / 60).toFixed(3)} hours
                                      </p>
                                      {session.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {session.mood && (
                                      <p>
                                        {/* <span className="text-xs font-medium text-muted-foreground">Mood:</span> */}
                                        <span className="text-xs text-right m-auto">{session.mood === 'great' ? '😄 Great' : session.mood === 'good' ? '🙂 Good' : session.mood === 'okay' ? '😐 Okay' : session.mood === 'difficult' ? '😓 Difficult' : '😴 Tiring'}</span>
                                      </p>
                                    )}
                                    <p className="text-sm font-medium">
                                      {(session.duration / 60).toFixed(3)}h
                                    </p>
                                    {session.value && (
                                      <p className="text-xs text-muted-foreground">{selectedGoal?.targetUnit == 'hours' ? Number(session.value).toFixed(3) + ' hours' : Number(session.value).toFixed(1) + ' ' + selectedGoal?.targetUnit || 'items'}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSessionsPage((prev) => Math.max(1, prev - 1))}
                                disabled={sessionsPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                Page {sessionsPage} of {totalPages} ({goalSessions.length} sessions)
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSessionsPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={sessionsPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.summary.totalHours}h</div>
              <p className="text-xs text-muted-foreground">
                {statistics.summary.sessionCount} sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.activeStreaks.reduce((max: number, s: any) => Math.max(max, s.days), 0)} days
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.activeStreaks.length} active goals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.summary.avgMinutesPerSession}m</div>
              <p className="text-xs text-muted-foreground">
                per session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Day</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(statistics.summary.bestDayMinutes / 60 * 10) / 10}h
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.summary.bestDay ? format(new Date(statistics.summary.bestDay), 'MMM d') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Your Goals</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px]"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(StudyCategoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'archived')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(() => {
          const activeGoals = goals.filter((goal) => {
            const progress = goal.progress || {};
            const matchesSearch = searchTerm === '' ||
              goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = categoryFilter === 'all' || goal.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' ||
              (statusFilter === 'active' && goal.isActive && (progress.progressPercentage || 0) < 100) ||
              (statusFilter === 'archived' && (!goal.isActive || (progress.progressPercentage || 0) >= 100));
            return matchesSearch && matchesCategory && matchesStatus;
          });
          const hasGoals = goals.length > 0;

          if (!hasGoals) {
            return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-4">
                    No study goals yet. Create your first goal to start tracking your learning!
                  </p>
                  <Button onClick={() => setIsCreateGoalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Goal
                  </Button>
                </CardContent>
              </Card>
            );
          }

          if (activeGoals.length === 0) {
            return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-2">
                    No goals match your filters.
                  </p>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Try adjusting your search term or filters.
                  </p>
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStatusFilter('active'); }}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGoals.map((goal) => {
                const config = StudyCategoryConfig[goal.category];
                const progress = goal.progress || {};
                const percentage = progress.progressPercentage || 0;
                const circumference = 2 * Math.PI * 36;
                const strokeDashoffset = circumference - (percentage / 100) * circumference;

                return (
                  <Card key={goal.id} className="hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <CardContent className="p-6 relative">
                        {/* Active/Archived Badge and Delete Button */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                          {!goal.isActive || percentage >= 100 ? (
                            <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600">
                              <Archive className="w-3 h-3 mr-1" />
                              {percentage >= 100 ? 'Completed' : 'Archived'}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs font-normal bg-green-500 hover:bg-green-600">
                              <Activity className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => setGoalToDelete(goal.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Circular Progress & Title Section */}
                      <div className="flex items-start gap-4 mb-5">
                        {/* Circular Progress Indicator */}
                        <div className="relative flex-shrink-0">
                          <svg className="w-20 h-20 transform -rotate-90">
                            {/* Background circle */}
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-muted"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeLinecap="round"
                              className={percentage >= 100 ? "text-green-500" : "text-primary"}
                              style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: strokeDashoffset,
                                transition: 'stroke-dashoffset 0.5s ease-in-out'
                              }}
                            />
                          </svg>
                          {/* Percentage in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-lg font-bold ${percentage >= 100 ? "text-green-600" : "text-primary"}`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>

                          {/* Title & Category */}
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{config?.icon}</span>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {config?.label}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-base leading-tight truncate">{goal.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {goal.createdAt ? format(new Date(goal.createdAt), 'MMM d, yyyy') : ''}
                            </p>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {goal.description.length > 100 ? goal.description.slice(0, 100) + '...' : goal.description}
                              </p>
                            )}
                          </div>
                        </div>

                      {/* Progress Bar */}
                      <div className="mb-5">
                        {goal.targetValue && (
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm text-muted-foreground">Progress</span>
                            <span className="text-sm font-medium">
                              {goal.targetUnit === 'hours' ? formatNumber(progress.totalHours) : formatNumber(progress.totalValue)} / {goal.targetValue} {goal.targetUnit}
                            </span>
                          </div>
                        )}
                        <Progress
                          value={Math.min(100, goal.targetValue ? (goal.targetUnit === 'hours'
                            ? ((progress.totalHours || 0) / goal.targetValue * 100)
                            : ((progress.totalValue || 0) / goal.targetValue * 100))
                            : 0)}
                          className="h-2.5"
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div
                          className="bg-muted/50 rounded-xl p-3 text-center cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setIsViewGoalSessionsOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="text-xl font-bold">{progress.sessionCount || 0}</div>
                          <div className="text-xs text-muted-foreground">Sessions</div>
                        </div>
                        <div className="bg-muted/50 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="text-xl font-bold">{formatNumber(progress.totalHours) || 0}h</div>
                          <div className="text-xs text-muted-foreground">Total Hours</div>
                        </div>
                        <div className="bg-muted/50 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="text-xl font-bold">{progress.currentStreak || 0}</div>
                          <div className="text-xs text-muted-foreground">Day Streak</div>
                        </div>
                      </div>

                      {/* Quick Action */}
                      <Button
                        className="w-full"
                        variant={percentage >= 100 ? 'secondary' : 'default'}
                        disabled={percentage >= 100 || !goal.isActive}
                        onClick={() => {
                          if (percentage < 100 && goal.isActive) {
                            setSelectedGoalForSession(goal.id);
                            setIsLogSessionOpen(true);
                          }
                        }}
                      >
                        {!goal.isActive ? (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Goal Archived
                          </>
                        ) : percentage >= 100 ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Goal Completed
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Log Session
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Delete Goal Confirmation Dialog */}
      <Dialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this goal? This action cannot be undone and all associated sessions will be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGoal}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
