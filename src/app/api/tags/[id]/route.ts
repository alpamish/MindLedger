import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { TagUpdateInput, ApiResponse } from '@/lib/domain/task.types';

// GET /api/tags/[id] - Get a single tag
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tag = await db.tag.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                project: true,
                list: true,
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tag not found',
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: tag,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tag',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/tags/[id] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: TagUpdateInput = await request.json();

    const tag = await db.tag.update({
      where: { id: params.id },
      data: {
        name: body.name,
        color: body.color,
        icon: body.icon,
        order: body.order,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: tag,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tag',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.tag.delete({
      where: { id: params.id },
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: params.id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tag',
        },
      },
      { status: 500 }
    );
  }
}
