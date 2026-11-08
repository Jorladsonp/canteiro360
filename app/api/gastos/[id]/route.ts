export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: {
      obra: { select: { id: true, nome: true } },
      itens: true,
      cobrancas: { include: { investidor: { select: { id: true, nome: true } } } },
    },
  });
  if (!gasto) return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
  if (user.role === 'INVESTIDOR') {
    const part = await prisma.participacao.findFirst({ where: { obraId: gasto.obraId, investidorId: user.id } });
    if (!part) return forbidden();
  }
  return NextResponse.json({
    ...gasto, valor: num(gasto.valor),
    itens: (gasto.itens ?? []).map((i: any) => ({ ...i, quantidade: num(i.quantidade), precoUnitario: num(i.precoUnitario) })),
    cobrancas: (gasto.cobrancas ?? []).map((c: any) => ({
      id: c.id, investidorId: c.investidorId, investidorNome: c.investidor?.nome,
      valor: num(c.valor), percentualAplicado: num(c.percentualAplicado), status: c.status, vencimento: c.vencimento,
    })),
  });
}
