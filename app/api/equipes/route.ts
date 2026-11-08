export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const equipes = await prisma.equipe.findMany({
    include: {
      membros: true,
      obraAtual: { select: { id: true, nome: true } },
    },
    orderBy: { nome: 'asc' },
  });
  return NextResponse.json(equipes.map((e: any) => ({
    id: e.id, nome: e.nome,
    obraAtualId: e.obraAtualId, obraAtualNome: e.obraAtual?.nome ?? null,
    membros: (e.membros ?? []).map((m: any) => ({ id: m.id, equipeId: m.equipeId, nome: m.nome, cargo: m.cargo, custoHora: num(m.custoHora) })),
    custoHoraEquipe: (e.membros ?? []).reduce((s: number, m: any) => s + num(m.custoHora), 0),
  })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { nome, obraAtualId, membros } = await req.json();
  if (!nome) return NextResponse.json({ error: 'Nome da equipe é obrigatório' }, { status: 400 });
  const equipe = await prisma.equipe.create({
    data: {
      nome, obraAtualId: obraAtualId ?? null,
      membros: membros?.length ? { create: membros.map((m: any) => ({ nome: m.nome, cargo: m.cargo, custoHora: Number(m.custoHora ?? 0) })) } : undefined,
    },
    include: { membros: true },
  });
  return NextResponse.json(equipe, { status: 201 });
}
