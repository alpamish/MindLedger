import { NextRequest, NextResponse } from 'next/server';

// GET /api/study-statistics - Get study statistics
export async function GET(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goalId');
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (goalId) {
      where.goalId = goalId;
    }

    const sessions = await prisma.studySession.findMany({
      where,
      include: {
        goal: true,
      },
      orderBy: { date: 'asc' },
    });

    // Calculate statistics
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = totalMinutes / 60;
    const sessionCount = sessions.length;
    const avgMinutesPerSession = sessionCount > 0 ? totalMinutes / sessionCount : 0;
    
    // Calculate daily totals
    const dailyTotals = new Map<string, number>();
    sessions.forEach((session) => {
      const dateKey = session.date.toISOString().split('T')[0];
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + session.duration);
    });

    // Find best day
    let bestDay = null;
    let bestDayMinutes = 0;
    dailyTotals.forEach((minutes, date) => {
      if (minutes > bestDayMinutes) {
        bestDayMinutes = minutes;
        bestDay = date;
      }
    });

    // Calculate streak info
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeStreaks = await prisma.studyStreak.findMany({
      where: {
        isActive: true,
        ...(goalId ? { goalId } : {}),
      },
      include: {
        goal: true,
      },
    });

    // Group by goal
    const goalStats = new Map();
    sessions.forEach((session) => {
      const goalId = session.goalId;
      if (!goalStats.has(goalId)) {
        goalStats.set(goalId, {
          goal: session.goal,
          totalMinutes: 0,
          sessionCount: 0,
        });
      }
      const stats = goalStats.get(goalId);
      stats.totalMinutes += session.duration;
      stats.sessionCount += 1;
    });

    // Build daily data for charts
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData.push({
        date: dateKey,
        minutes: dailyTotals.get(dateKey) || 0,
        hours: (dailyTotals.get(dateKey) || 0) / 60,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalMinutes,
          totalHours: Math.round(totalHours * 100) / 100,
          sessionCount,
          avgMinutesPerSession: Math.round(avgMinutesPerSession * 100) / 100,
          activeGoals: activeStreaks.length,
          bestDay,
          bestDayMinutes,
        },
        dailyData,
        goalsByStats: Array.from(goalStats.values()).map((stat) => ({
          ...stat,
          totalHours: Math.round((stat.totalMinutes / 60) * 100) / 100,
        })),
        activeStreaks,
      },
    });
  } catch (error) {
    console.error('Error fetching study statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch study statistics',
        },
      },
      { status: 500 }
    );
  }
}
