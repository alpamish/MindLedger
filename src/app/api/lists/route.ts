import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type {
  ListCreateInput,
  ListUpdateInput,
  ApiResponse,
} from '@/lib/domain/task.types';

// GET /api/lists - List all lists
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const lists = await db.list.findMany({
      where,
      include: {
        project: true,
        tasks: {
          where: {
            isArchived: false,
          },
          take: 5,
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            tasks: {
              where: {
                isArchived: false,
              },
            },
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    const response: ApiResponse<any[]> = {
      success: true,
      data: lists,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch lists',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const body: ListCreateInput = await request.json();

    // Get first workspace
    const workspace = await db.workspace.findFirst();
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

    // Get max order
    const maxOrder = await db.list.findFirst({
      where: { 
        workspaceId: workspace.id,
        projectId: body.projectId || null,
      },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const list = await db.list.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        description: body.description,
        color: body.color,
        projectId: body.projectId,
        isDefault: body.isDefault || false,
        order: (maxOrder?.order || 0) + 1,
      },
      include: {
        project: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: list,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create list',
        },
      },
      { status: 500 }
    );
  }
}
