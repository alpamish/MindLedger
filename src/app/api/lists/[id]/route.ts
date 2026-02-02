import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ListUpdateInput, ApiResponse } from '@/lib/domain/task.types';

// GET /api/lists/[id] - Get a single list
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const list = await db.list.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        tasks: {
          where: {
            isArchived: false,
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            subtasks: true,
          },
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
    });

    if (!list) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'List not found',
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: list,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch list',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/lists/[id] - Update a list
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: ListUpdateInput = await request.json();

    const list = await db.list.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        projectId: body.projectId,
        order: body.order,
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update list',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id] - Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.list.delete({
      where: { id: params.id },
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: params.id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete list',
        },
      },
      { status: 500 }
    );
  }
}
