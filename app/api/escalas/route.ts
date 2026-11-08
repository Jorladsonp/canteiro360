export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const escalas = await prisma.escala.findMany({
    include: {
      equipe: { select: { id: true, nome: true } },
      obra: { select: { id: true, nome: true } },
    },
    orderBy: { dataInicio: 'desc' },
    take: 200,
  });
  return NextResponse.json(escalas.map((e: any) => ({
    id: e.id, equipeId: e.equipeId, obraId: e.obraId,
    dataInicio: e.dataInicio, dataFim: e.dataFim, tarefa: e.tarefa,
    equipeNome: e.equipe?.nome, obraNome: e.obra?.nome,
  })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { equipeId, obraId, dataInicio, dataFim, tarefa } = body ?? {};
  if (!equipeId || !dataInicio || !dataFim || !tarefa) {
    return NextResponse.json({ error: 'Campos obrigatórios: equipeId, dataInicio, dataFim, tarefa' }, { status: 400 });
  }
  const escala = await prisma.escala.create({
    data: { equipeId, obraId: obraId ?? null, dataInicio: new Date(dataInicio), dataFim: new Date(dataFim), tarefa },
  });
  return NextResponse.json(escala, { status: 201 });
}
