import { NextRequest, NextResponse } from 'next/server';

// GET /api/study-goals/[id] - Get a single study goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const goal = await prisma.studyGoal.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { date: 'desc' },
        },
        streaks: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Study goal not found',
          },
        },
        { status: 404 }
      );
    }

    // Calculate progress
    const totalMinutes = goal.sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalHours = totalMinutes / 60;
    const totalValue = goal.sessions.reduce((sum, session) => sum + (session.value || 0), 0);
    const currentStreak = goal.streaks.find(s => s.isActive) || null;
    
    // Calculate progress percentage
    let progressPercentage = 0;
    if (goal.targetValue && goal.targetUnit) {
      if (goal.targetUnit === 'hours') {
        progressPercentage = Math.min((totalHours / goal.targetValue) * 100, 100);
      } else {
        progressPercentage = Math.min((totalValue / goal.targetValue) * 100, 100);
      }
    }

    const goalWithProgress = {
      ...goal,
      progress: {
        totalMinutes,
        totalHours: Math.round(totalHours * 100) / 100,
        totalValue,
        sessionCount: goal.sessions.length,
        currentStreak: currentStreak?.days || 0,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
      },
    };

    return NextResponse.json({
      success: true,
      data: goalWithProgress,
    });
  } catch (error) {
    console.error('Error fetching study goal:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch study goal',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/study-goals/[id] - Update a study goal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const body = await request.json();
    const { title, description, category, targetValue, targetUnit, startDate, endDate, color, icon, isActive } = body;

    const goal = await prisma.studyGoal.update({
      where: { id },
      data: {
        title,
        description,
        category,
        targetValue,
        targetUnit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        color,
        icon,
        isActive,
      },
      include: {
        sessions: true,
        streaks: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error('Error updating study goal:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update study goal',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/study-goals/[id] - Delete a study goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.studyGoal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting study goal:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete study goal',
        },
      },
      { status: 500 }
    );
  }
}
