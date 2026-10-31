import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session.ts';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
