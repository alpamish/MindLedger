import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import type { BulkOperation, BulkResult, ApiResponse } from '@/lib/domain/task.types';

// POST /api/tasks/bulk - Perform bulk operations on tasks
export async function POST(request: NextRequest) {
  try {
    const body: BulkOperation = await request.json();
    const { operation, taskIds, data } = body;

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Task IDs are required',
          },
        },
        { status: 400 }
      );
    }

    const result: BulkResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const taskId of taskIds) {
      try {
        switch (operation) {
          case 'update':
            if (!data) throw new Error('Update data is required');
            await db.task.update({
              where: { id: taskId },
              data,
            });
            result.success++;
            break;

          case 'delete':
            await db.task.delete({
              where: { id: taskId },
            });
            result.success++;
            break;

          case 'archive':
            await db.task.update({
              where: { id: taskId },
              data: {
                isArchived: true,
                archivedAt: new Date(),
              },
            });
            result.success++;
            break;

          case 'unarchive':
            await db.task.update({
              where: { id: taskId },
              data: {
                isArchived: false,
                archivedAt: null,
              },
            });
            result.success++;
            break;

          case 'move':
            if (!data || (!data.projectId && !data.listId)) {
              throw new Error('Project ID or List ID is required for move operation');
            }
            await db.task.update({
              where: { id: taskId },
              data: {
                projectId: data.projectId,
                listId: data.listId,
              },
            });
            result.success++;
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response: ApiResponse<BulkResult> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk operation',
        },
      },
      { status: 500 }
    );
  }
}
