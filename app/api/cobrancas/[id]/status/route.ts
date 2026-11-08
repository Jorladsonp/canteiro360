export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { logAudit } from '@/lib/audit';
import { inicioDoDia } from '@/lib/dates';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { acao } = await req.json();
  const c = await prisma.cobranca.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 });
  if (user.role === 'INVESTIDOR' && c.investidorId !== user.id) return forbidden();

  let newStatus: string;
  let extra: any = {};
  if (acao === 'informar_pagamento') {
    if (!['PENDENTE', 'ATRASADO'].includes(c.status)) return NextResponse.json({ error: 'Ação não permitida para este status' }, { status: 400 });
    newStatus = 'PAGO_AGUARDANDO_CONFIRMACAO';
    extra = { pagoInformadoEm: new Date() };
  } else if (acao === 'confirmar') {
    if (user.role !== 'GESTOR') return forbidden();
    if (!['PAGO_AGUARDANDO_CONFIRMACAO', 'PENDENTE', 'ATRASADO'].includes(c.status)) return NextResponse.json({ error: 'Ação não permitida para este status' }, { status: 400 });
    newStatus = 'PAGO';
    extra = { confirmadoEm: new Date(), confirmadoPorId: user.id };
  } else if (acao === 'rejeitar') {
    if (user.role !== 'GESTOR') return forbidden();
    if (c.status !== 'PAGO_AGUARDANDO_CONFIRMACAO') return NextResponse.json({ error: 'Só é possível rejeitar cobranças aguardando confirmação' }, { status: 400 });
    const venceu = c.vencimento && c.vencimento < inicioDoDia();
    newStatus = venceu ? 'ATRASADO' : 'PENDENTE';
    extra = { pagoInformadoEm: null };
  } else {
    return NextResponse.json({ error: 'Ação inválida. Use: informar_pagamento, confirmar, rejeitar' }, { status: 400 });
  }

  const updated = await prisma.cobranca.update({ where: { id }, data: { status: newStatus as any, ...extra } });
  await logAudit({ userId: user.id, acao: `COBRANCA_${acao.toUpperCase()}`, entidade: 'Cobranca', entidadeId: id, anterior: { status: c.status }, novo: { status: newStatus } });
  return NextResponse.json(updated);
}
