export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, nome: true, email: true, role: true, telefone: true,
      firstLogin: true, onboardingConcluido: true, ativo: true,
    },
  });
  if (!dbUser) return unauthorized();
  return NextResponse.json(dbUser);
}
