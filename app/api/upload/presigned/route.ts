export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { generatePresignedUploadUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { fileName, contentType, isPublic } = await req.json();
  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName e contentType são obrigatórios' }, { status: 400 });
  }
  const result = await generatePresignedUploadUrl(fileName, contentType, isPublic ?? false);
  return NextResponse.json(result);
}
