import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { squares } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - Fetch a single square by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [square] = await db
      .select()
      .from(squares)
      .where(eq(squares.id, id))
      .limit(1);

    if (!square) {
      return NextResponse.json(
        { error: 'Square not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(square);
  } catch (error) {
    console.error('Error fetching square:', error);
    return NextResponse.json(
      { error: 'Failed to fetch square' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a square (for donor information)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { donorName, isAnonymous } = body;

    const [updatedSquare] = await db
      .update(squares)
      .set({
        donorName: isAnonymous ? null : donorName,
        isAnonymous: isAnonymous || false,
      })
      .where(eq(squares.id, id))
      .returning();

    if (!updatedSquare) {
      return NextResponse.json(
        { error: 'Square not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSquare);
  } catch (error) {
    console.error('Error updating square:', error);
    return NextResponse.json(
      { error: 'Failed to update square' },
      { status: 500 }
    );
  }
}
