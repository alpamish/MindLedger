import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import type { TaskUpdateInput, ApiResponse } from '@/lib/domain/task.types';
import { validateTaskTitle, validateTaskDescription } from '@/lib/domain/task.utils';

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: true,
        list: true,
        tags: {
          include: {
            tag: true,
          },
        },
        subtasks: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            timeTracking: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        dependencies: {
          include: {
            dependencyTask: {
              include: {
                project: true,
                list: true,
              },
            },
          },
        },
        dependents: {
          include: {
            dependentTask: {
              include: {
                project: true,
                list: true,
              },
            },
          },
        },
        timeTracking: true,
        reminders: true,
        attachments: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<any> = {
      success: true,
      data: task,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch task',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: TaskUpdateInput = await request.json();

    // Validate if title is being updated
    if (body.title !== undefined) {
      const titleValidation = validateTaskTitle(body.title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: titleValidation.error,
            },
          },
          { status: 400 }
        );
      }
    }

    if (body.description !== undefined) {
      const descValidation = validateTaskDescription(body.description);
      if (!descValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: descValidation.error,
            },
          },
          { status: 400 }
        );
      }
    }

    // Check if task exists
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Set completedAt when status changes to DONE
      if (body.status === TaskStatus.DONE && !existingTask.completedAt) {
        updateData.completedAt = new Date();
      } else if (body.status !== TaskStatus.DONE) {
        updateData.completedAt = null;
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.listId !== undefined) updateData.listId = body.listId;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.recurrenceRule !== undefined) updateData.recurrenceRule = body.recurrenceRule;
    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
      updateData.archivedAt = body.isArchived ? new Date() : null;
    }
    if (body.order !== undefined) updateData.order = body.order;
    if (body.position !== undefined) updateData.position = body.position;

    // Update task
    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        list: true,
        tags: {
          include: {
            tag: true,
          },
        },
        subtasks: true,
        dependencies: {
          include: {
            dependencyTask: true,
          },
        },
        dependents: {
          include: {
            dependentTask: true,
          },
        },
        timeTracking: true,
        reminders: true,
        attachments: true,
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: task,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update task',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if task exists
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      );
    }

    // Delete task (cascade will handle related records)
    await db.task.delete({
      where: { id },
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete task',
        },
      },
      { status: 500 }
    );
  }
}
