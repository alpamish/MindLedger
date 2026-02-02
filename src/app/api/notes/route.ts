import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notes - List notes with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const isPinned = searchParams.get('isPinned');
    const isArchived = searchParams.get('isArchived');
    const searchQuery = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDirection = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

    // Build Prisma query
    const where: any = {};

    if (isPinned !== null) {
      where.isPinned = isPinned === 'true';
    }

    if (isArchived !== null) {
      where.isArchived = isArchived === 'true';
    }

    // Fetch notes from database
    let notes = await db.note.findMany({
      where,
      orderBy: {
        [sortBy]: sortDirection,
      },
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      notes = notes.filter(
        (note) =>
          (note.title && note.title.toLowerCase().includes(query)) ||
          note.content.toLowerCase().includes(query)
      );
    }

    const response = {
      success: true,
      data: notes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notes',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get or create default workspace
    let workspace = await db.workspace.findFirst();
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'Default Workspace',
          description: 'Auto-created workspace for notes',
        },
      });
    }

    // Create note
    const note = await db.note.create({
      data: {
        workspaceId: workspace.id,
        title: body.title || undefined,
        content: body.content?.trim() || '',
        color: body.color || undefined,
        isPinned: body.isPinned || false,
      },
    });

    const response = {
      success: true,
      data: note,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create note',
        },
      },
      { status: 500 }
    );
  }
}
