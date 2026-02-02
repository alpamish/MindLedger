import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('TEST ROUTE CALLED - timestamp:', Date.now());
  return NextResponse.json({
    success: true,
    message: 'Test route is working!',
    timestamp: Date.now(),
  });
}
