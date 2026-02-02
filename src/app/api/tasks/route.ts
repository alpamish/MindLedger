import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus, TaskPriority } from '@prisma/client';
import type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilters,
  ApiResponse,
  PaginatedResponse,
} from '@/lib/domain/task.types';
import {
  validateTaskTitle,
  validateTaskDescription,
  sortTasks,
  matchesFilters,
  isTaskCompleted,
} from '@/lib/domain/task.utils';

// GET /api/tasks - List tasks with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const projectId = searchParams.get('projectId');
    const listId = searchParams.get('listId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const tagId = searchParams.get('tagId');
    const isArchived = searchParams.get('isArchived');
    const isCompleted = searchParams.get('isCompleted');
    const isOverdue = searchParams.get('isOverdue');
    const searchQuery = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'order';
    const sortDirection = (searchParams.get('sortDir') || 'asc') as 'asc' | 'desc';
    const includeSubtasks = searchParams.get('includeSubtasks') === 'true';

    // Build Prisma query
    const where: any = {
      isArchived: isArchived === 'true',
    };

    if (projectId) where.projectId = projectId;
    if (listId) where.listId = listId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId,
        },
      };
    }

    // Fetch tasks from database
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: true,
          list: true,
          tags: {
            include: {
              tag: true,
            },
          },
          subtasks: includeSubtasks ? {
            include: {
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          } : false,
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
        orderBy: {
          [sortBy]: sortDirection,
        },
      }),
      db.task.count({ where }),
    ]);

    // Apply additional filters that need logic
    let filteredTasks = tasks;
    
    if (isCompleted !== null) {
      const completed = isCompleted === 'true';
      filteredTasks = filteredTasks.filter((task) => isTaskCompleted(task.status) === completed);
    }

    if (isOverdue === 'true') {
      const now = new Date();
      filteredTasks = filteredTasks.filter(
        (task) => task.dueDate && new Date(task.dueDate) < now && !isTaskCompleted(task.status)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting if needed
    if (sortBy !== 'order' || sortDirection !== 'asc') {
      filteredTasks = sortTasks(filteredTasks, { field: sortBy as any, direction: sortDirection });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedTasks = filteredTasks.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(filteredTasks.length / limit);

    const response: ApiResponse<PaginatedResponse<any>> = {
      success: true,
      data: {
        data: paginatedTasks,
        pagination: {
          page,
          limit,
          total: filteredTasks.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tasks',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body: TaskCreateInput = await request.json();

    // Validate
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

    // For simplicity, use the first workspace
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

    // Create task
    const task = await db.task.create({
      data: {
        workspaceId: workspace.id,
        title: body.title,
        description: body.description,
        status: body.status || TaskStatus.TODO,
        priority: body.priority || TaskPriority.MEDIUM,
        dueDate: body.dueDate,
        startDate: body.startDate,
        projectId: body.projectId,
        listId: body.listId,
        parentId: body.parentId,
        recurrenceRule: body.recurrenceRule,
      },
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

    // Create time tracking if estimated minutes provided
    if (body.estimatedMinutes) {
      await db.timeTracking.create({
        data: {
          taskId: task.id,
          estimatedMinutes: body.estimatedMinutes,
        },
      });
    }

    // Add tags if provided
    if (body.tags && body.tags.length > 0) {
      for (const tagId of body.tags) {
        await db.taskTag.create({
          data: {
            taskId: task.id,
            tagId: tagId,
          },
        });
      }
    }

    // Fetch updated task with relations
    const updatedTask = await db.task.findUnique({
      where: { id: task.id },
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
      data: updatedTask,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create task',
        },
      },
      { status: 500 }
    );
  }
}
