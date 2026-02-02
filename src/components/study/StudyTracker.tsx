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
import {
  Plus,
  BookOpen,
  Clock,
  Flame,
  TrendingUp,
  BarChart3,
  Pause,
  Play,
} from 'lucide-react';

export function StudyTracker() {
  const studyStore = useStudyStore();
  
  // Local state
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const [selectedGoalForSession, setSelectedGoalForSession] = useState<string | null>(null);
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

  // Initialize
  useEffect(() => {
    studyStore.fetchGoals();
    studyStore.fetchStatistics();
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

  // Handle create goal
  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;

    await studyStore.createGoal({
      title: newGoalTitle.trim(),
      description: newGoalDescription.trim() || undefined,
      category: newGoalCategory,
      targetValue: newGoalTargetValue ? parseFloat(newGoalTargetValue) : undefined,
      targetUnit: newGoalTargetUnit,
    });

    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalCategory(StudyCategory.OTHER);
    setNewGoalTargetValue('');
    setNewGoalTargetUnit('hours');
    setIsCreateGoalOpen(false);
  };

  // Handle log session
  const handleLogSession = async () => {
    if (!selectedGoalForSession || (!sessionDuration && timerSeconds === 0)) return;

    // Calculate duration - if timer was used, ensure at least 1 minute
    const duration = timerSeconds > 0
      ? Math.max(1, Math.floor(timerSeconds / 60))
      : parseInt(sessionDuration);

    if (isNaN(duration) || duration <= 0) {
      console.error('Invalid duration:', duration);
      return;
    }

    await studyStore.logSession({
      goalId: selectedGoalForSession,
      duration,
      value: sessionValue ? parseFloat(sessionValue) : undefined,
      notes: sessionNotes.trim() || undefined,
      mood: sessionMood || undefined,
    });

    setSessionDuration('');
    setSessionValue('');
    setSessionNotes('');
    setSessionMood('');
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

  const goals = Array.from(studyStore.goals.values());
  const statistics = studyStore.statistics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Study Tracker</h2>
          <p className="text-muted-foreground">Track your learning progress and build consistent habits</p>
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
                    <Label htmlFor="target-value">Target Value</Label>
                    <Input
                      id="target-value"
                      type="number"
                      placeholder="100"
                      value={newGoalTargetValue}
                      onChange={(e) => setNewGoalTargetValue(e.target.value)}
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
                <Button onClick={handleCreateGoal} disabled={!newGoalTitle.trim()}>
                  Create Goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isLogSessionOpen} onOpenChange={setIsLogSessionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Log Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Study Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="session-goal">Goal *</Label>
                  <Select value={selectedGoalForSession || ''} onValueChange={setSelectedGoalForSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {StudyCategoryConfig[goal.category]?.icon} {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timer */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-4 bg-muted rounded-lg text-center">
                      <div className="text-3xl font-mono font-bold">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-duration">Or enter duration manually (minutes)</Label>
                  <Input
                    id="manual-duration"
                    type="number"
                    placeholder="30"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    disabled={timerSeconds > 0}
                  />
                </div>

                {selectedGoalForSession && (
                  <div className="space-y-2">
                    <Label htmlFor="session-value">Value Completed ({goals.find(g => g.id === selectedGoalForSession)?.targetUnit || 'pages'})</Label>
                    <Input
                      id="session-value"
                      type="number"
                      placeholder="5"
                      value={sessionValue}
                      onChange={(e) => setSessionValue(e.target.value)}
                    />
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
                  disabled={!selectedGoalForSession || (!sessionDuration && timerSeconds === 0)}
                >
                  Log Session
                </Button>
              </DialogFooter>
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
        <h3 className="text-xl font-semibold mb-4">Study Goals</h3>
        {goals.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
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
                      <Badge variant={goal.isActive ? 'default' : 'secondary'}>
                        {goal.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    {goal.targetValue && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {progress.progressPercentage || 0}%
                          </span>
                        </div>
                        <Progress value={progress.progressPercentage || 0} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{goal.targetUnit === 'hours' ? progress.totalHours?.toFixed(1) : progress.totalValue} / {goal.targetValue} {goal.targetUnit}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold">{progress.sessionCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Sessions</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold">{progress.totalHours?.toFixed(1) || 0}h</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold">{progress.currentStreak || 0}🔥</div>
                        <div className="text-xs text-muted-foreground">Streak</div>
                      </div>
                    </div>

                    {/* Quick Action */}
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoalForSession(goal.id);
                        setIsLogSessionOpen(true);
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Log Session
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress by Goal */}
      {statistics && statistics.goalsByStats && statistics.goalsByStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress by Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.goalsByStats.map((stat: any) => (
                <div key={stat.goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{StudyCategoryConfig[stat.goal.category]?.icon}</span>
                      <span className="font-medium">{stat.goal.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stat.totalHours.toFixed(1)}h • {stat.sessionCount} sessions
                    </span>
                  </div>
                  <Progress value={Math.min((stat.totalHours / (stat.goal.targetValue || stat.totalHours)) * 100, 100)} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
