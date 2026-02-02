import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ApiResponse,
} from '@/lib/domain/task.types';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const projects = await db.project.findMany({
      include: {
        tasks: {
          take: 5,
          orderBy: {
            order: 'asc',
          },
        },
        lists: {
          orderBy: {
            order: 'asc',
          },
        },
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
      data: projects,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch projects',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body: ProjectCreateInput = await request.json();

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

    // Get max order for new project
    const maxOrder = await db.project.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        order: (maxOrder?.order || 0) + 1,
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

    // Create default list for the project
    await db.list.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        name: 'To Do',
        isDefault: true,
        order: 0,
      },
    });

    // Fetch updated project
    const updatedProject = await db.project.findUnique({
      where: { id: project.id },
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
      data: updatedProject,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project',
        },
      },
      { status: 500 }
    );
  }
}
