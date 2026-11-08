export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { getAtalhos } from '@/lib/chat-tools';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return NextResponse.json(getAtalhos(user.role));
}
