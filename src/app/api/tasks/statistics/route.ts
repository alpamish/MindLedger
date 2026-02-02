import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { TaskStatistics, ApiResponse } from '@/lib/domain/task.types';
import { calculateTaskStatistics } from '@/lib/domain/task.utils';

// GET /api/tasks/statistics - Get task statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const listId = searchParams.get('listId');
    const tagId = searchParams.get('tagId');

    const where: any = {
      isArchived: false,
    };

    if (projectId) where.projectId = projectId;
    if (listId) where.listId = listId;
    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId,
        },
      };
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        timeTracking: true,
      },
    });

    const statistics = calculateTaskStatistics(tasks);

    const response: ApiResponse<TaskStatistics> = {
      success: true,
      data: statistics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch task statistics',
        },
      },
      { status: 500 }
    );
  }
}
