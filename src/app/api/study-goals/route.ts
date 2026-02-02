import { NextRequest, NextResponse } from 'next/server';

console.log('STUDY-GOALS ROUTE LOADED - v3 with dynamic imports - timestamp:', Date.now());

// GET /api/study-goals - List all study goals (v2 - fixed imports)
export async function GET(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const category = searchParams.get('category');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (category) {
      where.category = category;
    }

    const goals = await prisma.studyGoal.findMany({
      where,
      include: {
        sessions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        streaks: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => {
      const totalMinutes = goal.sessions.reduce((sum, session) => sum + session.duration, 0);
      const totalHours = totalMinutes / 60;
      const totalValue = goal.sessions.reduce((sum, session) => sum + (session.value || 0), 0);
      const currentStreak = goal.streaks[0] || null;

      return {
        ...goal,
        progress: {
          totalMinutes,
          totalHours: Math.round(totalHours * 100) / 100,
          totalValue,
          sessionCount: goal._count.sessions,
          currentStreak: currentStreak?.days || 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: goalsWithProgress,
    });
  } catch (error) {
    console.error('Error fetching study goals:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch study goals',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/study-goals - Create a new study goal
export async function POST(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const body = await request.json();
    const { title, description, category, targetValue, targetUnit, startDate, endDate, color, icon } = body;

    // Get first workspace
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No workspace found',
          },
        },
        { status: 404 }
      );
    }

    const goal = await prisma.studyGoal.create({
      data: {
        workspaceId: workspace.id,
        title,
        description,
        category: category || 'OTHER',
        targetValue,
        targetUnit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        color,
        icon,
      },
      include: {
        sessions: true,
        streaks: true,
        _count: {
          select: { sessions: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: goal,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating study goal:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create study goal',
        },
      },
      { status: 500 }
    );
  }
}
