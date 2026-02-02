import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notes/[id] - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const note = await db.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Note not found',
          },
        },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      data: note,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch note',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if note exists
    const existingNote = await db.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Note not found',
          },
        },
        { status: 404 }
      );
    }

    // Validate content if provided
    if (body.content !== undefined && body.content.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Note content cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    // Update note
    const note = await db.note.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title || undefined }),
        ...(body.content !== undefined && { content: body.content.trim() }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
        ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
      },
    });

    const response = {
      success: true,
      data: note,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update note',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if note exists
    const existingNote = await db.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Note not found',
          },
        },
        { status: 404 }
      );
    }

    // Delete note
    await db.note.delete({
      where: { id },
    });

    const response = {
      success: true,
      data: { id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete note',
        },
      },
      { status: 500 }
    );
  }
}
