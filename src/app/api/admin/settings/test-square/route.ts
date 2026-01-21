import { NextResponse } from 'next/server';
import { testSquareConnection } from '@/lib/square';
import { auth } from '@/lib/auth';

/**
 * POST /api/admin/settings/test-square
 * Test Square connection with current configuration
 */
export async function POST() {
  // Check authentication
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await testSquareConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing Square connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
