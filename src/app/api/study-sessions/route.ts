import { NextRequest, NextResponse } from 'next/server';

// GET /api/study-sessions - List study sessions
export async function GET(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (goalId) where.goalId = goalId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const sessions = await prisma.studySession.findMany({
      where,
      include: {
        goal: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching study sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch study sessions',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/study-sessions - Log a new study session
export async function POST(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const body = await request.json();
    const { goalId, duration, value, notes, mood, date } = body;

    console.log('Study session data received:', { goalId, duration, value, notes, mood, date });

    // Validate
    if (!goalId || !duration) {
      console.error('Validation failed - missing goalId or duration:', { goalId, duration });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Goal ID and duration are required',
          },
        },
        { status: 400 }
      );
    }

    // Parse duration - handle both string and number
    const parsedDuration = typeof duration === 'string' ? parseInt(duration, 10) : duration;

    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      console.error('Invalid duration:', duration, 'parsed:', parsedDuration);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Duration must be a positive number',
          },
        },
        { status: 400 }
      );
    }

    // Create session
    const session = await prisma.studySession.create({
      data: {
        goalId,
        duration: parsedDuration,
        value,
        notes,
        mood,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        goal: true,
      },
    });

    console.log('Session created successfully:', session.id);

    // Update or create streak
    await updateStreak(goalId);

    return NextResponse.json({
      success: true,
      data: session,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating study session:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create study session',
        },
      },
      { status: 500 }
    );
  }
}

// Helper function to update streak
async function updateStreak(goalId: string) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if there's a session today
  const sessionToday = await prisma.studySession.findFirst({
    where: {
      goalId,
      date: {
        gte: today,
      },
    },
  });

  if (!sessionToday) return;

  // Find active streak
  const activeStreak = await prisma.studyStreak.findFirst({
    where: {
      goalId,
      isActive: true,
    },
  });

  if (activeStreak) {
    const streakDate = new Date(activeStreak.startDate);
    streakDate.setHours(0, 0, 0, 0);

    // Check if streak is from yesterday (continuing)
    if (streakDate.getTime() === yesterday.getTime()) {
      // Continue the streak
      await prisma.studyStreak.update({
        where: { id: activeStreak.id },
        data: {
          days: activeStreak.days + 1,
        },
      });
    } else if (streakDate.getTime() !== today.getTime()) {
      // Streak broken, start new one
      await prisma.studyStreak.updateMany({
        where: { goalId },
        data: { isActive: false },
      });

      await prisma.studyStreak.create({
        data: {
          goalId,
          startDate: today,
          days: 1,
          isActive: true,
        },
      });
    }
  } else {
    // Create new streak
    await prisma.studyStreak.create({
      data: {
        goalId,
        startDate: today,
        days: 1,
        isActive: true,
      },
    });
  }
}
