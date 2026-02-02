import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ProjectUpdateInput, ApiResponse } from '@/lib/domain/task.types';

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await db.project.findUnique({
      where: { id: params.id },
      include: {
        lists: {
          orderBy: {
            order: 'asc',
          },
        },
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

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch project',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: ProjectUpdateInput = await request.json();

    const project = await db.project.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        isArchived: body.isArchived,
        order: body.order,
      },
      include: {
        lists: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update project',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.project.delete({
      where: { id: params.id },
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: params.id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete project',
        },
      },
      { status: 500 }
    );
  }
}
