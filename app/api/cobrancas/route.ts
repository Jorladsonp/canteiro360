export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { inicioDoDia } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  // Atualizar atrasadas
  await prisma.cobranca.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: inicioDoDia() } },
    data: { status: 'ATRASADO' },
  });
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const obraId = url.searchParams.get('obraId');
  const investidorId = url.searchParams.get('investidorId');
  const where: any = {};
  if (status) {
    const statusList = status.split(',').filter((s: string) => ['PENDENTE', 'PAGO_AGUARDANDO_CONFIRMACAO', 'PAGO', 'ATRASADO'].includes(s));
    if (statusList.length) where.status = { in: statusList };
  }
  if (obraId) where.obraId = obraId;
  if (user.role === 'INVESTIDOR') {
    where.investidorId = user.id;
  } else if (investidorId) {
    where.investidorId = investidorId;
  }
  const lista = await prisma.cobranca.findMany({
    where,
    include: {
      obra: { select: { id: true, nome: true } },
      gasto: { select: { id: true, fornecedor: true, valor: true, categoria: true, descricao: true } },
      investidor: { select: { id: true, nome: true } },
    },
    orderBy: [{ vencimento: 'asc' }, { createdAt: 'desc' }],
    take: 1000,
  });
  return NextResponse.json(lista.map((c: any) => ({
    id: c.id, obraId: c.obraId, obraNome: c.obra?.nome, gastoId: c.gastoId, fornecedor: c.gasto?.fornecedor,
    categoria: c.gasto?.categoria, descricao: c.gasto?.descricao, valorNota: num(c.gasto?.valor),
    investidorId: c.investidorId, investidorNome: c.investidor?.nome,
    valor: num(c.valor), percentualAplicado: num(c.percentualAplicado), vencimento: c.vencimento, status: c.status,
    pagoInformadoEm: c.pagoInformadoEm, confirmadoEm: c.confirmadoEm, createdAt: c.createdAt,
  })));
}
