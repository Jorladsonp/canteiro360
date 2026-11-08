export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);
  return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
}
