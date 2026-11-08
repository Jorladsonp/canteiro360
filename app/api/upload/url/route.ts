export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { getFileUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { cloud_storage_path, contentType, isPublic } = await req.json();
  if (!cloud_storage_path) {
    return NextResponse.json({ error: 'cloud_storage_path é obrigatório' }, { status: 400 });
  }
  const url = await getFileUrl(cloud_storage_path, contentType ?? 'application/octet-stream', isPublic ?? false);
  return NextResponse.json({ url });
}
