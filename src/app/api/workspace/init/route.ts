import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/workspace/init - Initialize or get default workspace
export async function GET() {
  try {
    // Try to get existing workspace
    let workspace = await db.workspace.findFirst();

    // Create default workspace if none exists
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'My Workspace',
          description: 'Default workspace',
        },
      });

      // Create default tags
      await db.tag.createMany({
        data: [
          { workspaceId: workspace.id, name: 'Work', color: '#3B82F6', icon: 'briefcase' },
          { workspaceId: workspace.id, name: 'Personal', color: '#10B981', icon: 'user' },
          { workspaceId: workspace.id, name: 'Urgent', color: '#EF4444', icon: 'alert' },
        ],
      });

      // Create a default project
      const project = await db.project.create({
        data: {
          workspaceId: workspace.id,
          name: 'My Project',
          color: '#6366F1',
          icon: '📋',
        },
      });

      // Create default lists
      await db.list.createMany({
        data: [
          { workspaceId: workspace.id, projectId: project.id, name: 'To Do', isDefault: true, order: 0 },
          { workspaceId: workspace.id, projectId: project.id, name: 'In Progress', order: 1 },
          { workspaceId: workspace.id, projectId: project.id, name: 'Done', order: 2 },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Error initializing workspace:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to initialize workspace',
        },
      },
      { status: 500 }
    );
  }
}
