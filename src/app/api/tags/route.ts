import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type {
  TagCreateInput,
  TagUpdateInput,
  ApiResponse,
} from '@/lib/domain/task.types';

// GET /api/tags - List all tags
export async function GET(request: NextRequest) {
  try {
    const tags = await db.tag.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    const response: ApiResponse<any[]> = {
      success: true,
      data: tags,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tags',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const body: TagCreateInput = await request.json();

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
    const maxOrder = await db.tag.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const tag = await db.tag.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        color: body.color,
        icon: body.icon,
        order: (maxOrder?.order || 0) + 1,
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create tag',
        },
      },
      { status: 500 }
    );
  }
}
