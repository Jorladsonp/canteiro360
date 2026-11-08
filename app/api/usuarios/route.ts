export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const users = await prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, telefone: true, ativo: true, firstLogin: true, createdAt: true },
    orderBy: { nome: 'asc' },
  });
  return NextResponse.json(users);
}
