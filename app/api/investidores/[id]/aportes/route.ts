export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { recalcularParticipacoes } from '@/lib/participacao.util';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (user.role === 'INVESTIDOR' && user.id !== id) return forbidden();
  const aportes = await prisma.aporte.findMany({
    where: { investidorId: id },
    include: { obra: { select: { id: true, nome: true } } },
    orderBy: { data: 'desc' },
  });
  return NextResponse.json(aportes.map((a: any) => ({
    id: a.id, obraId: a.obraId, obraNome: a.obra?.nome, investidorId: a.investidorId,
    valor: num(a.valor), data: a.data, observacao: a.observacao,
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { id } = await params;
  const body = await req.json();
  const { obraId, valor, data, observacao } = body ?? {};
  if (!obraId || !valor) {
    return NextResponse.json({ error: 'Campos obrigatórios: obraId, valor' }, { status: 400 });
  }
  const inv = await prisma.user.findUnique({ where: { id } });
  if (!inv || inv.role !== 'INVESTIDOR') return NextResponse.json({ error: 'Investidor não encontrado' }, { status: 404 });
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

  const result = await prisma.$transaction(async (tx: any) => {
    const aporte = await tx.aporte.create({
      data: {
        obraId, investidorId: id, valor: Number(valor),
        data: data ? new Date(data) : new Date(),
        observacao: observacao ?? null, createdById: user.id,
      },
    });
    const parts = await recalcularParticipacoes(tx, obraId);
    await logAudit({
      userId: user.id, acao: 'REGISTRAR_APORTE', entidade: 'Obra', entidadeId: obraId,
      novo: { aporte: { id: aporte.id, investidorId: id, valor: Number(valor) }, participacoes: parts },
      tx,
    });
    return { aporte, participacoes: parts };
  });
  return NextResponse.json(result, { status: 201 });
}
