export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { calcularRateio } from '@/lib/rateio.calc';
import { logAudit } from '@/lib/audit';

// GET: listar rateios / vendas
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const vendas = await prisma.venda.findMany({
    include: {
      obra: { select: { id: true, nome: true } },
      rateios: { include: { investidor: { select: { id: true, nome: true } } } },
    },
    orderBy: { dataVenda: 'desc' },
  });
  const filtered = user.role === 'INVESTIDOR'
    ? vendas.filter((v: any) => (v.rateios ?? []).some((r: any) => r?.investidorId === user.id))
    : vendas;
  return NextResponse.json(filtered.map((v: any) => ({
    obraId: v.obraId, obraNome: v.obra?.nome, dataVenda: v.dataVenda,
    valorVenda: num(v.valorVenda), custoTotal: num(v.custoTotal), lucro: num(v.lucro),
    parteGestor: num(v.parteGestor), parteInvestidores: num(v.parteInvestidores),
    itens: (v.rateios ?? []).map((r: any) => ({
      investidorId: r.investidorId, nome: r.investidor?.nome, percentual: num(r.percentual), valor: num(r.valor),
    })),
  })));
}

// POST: simular ou registrar venda
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { obraId, valorVenda, confirmar } = body ?? {};
  if (!obraId || !valorVenda) {
    return NextResponse.json({ error: 'Campos obrigatórios: obraId, valorVenda' }, { status: 400 });
  }
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: { participacoes: { orderBy: { investidorId: 'asc' } }, venda: true },
  });
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  if (obra.venda) return NextResponse.json({ error: 'Obra já foi vendida' }, { status: 400 });

  const r = calcularRateio(
    Number(valorVenda), num(obra.custoTotal),
    (obra.participacoes ?? []).map((p: any) => ({ investidorId: p.investidorId, percentual: num(p.percentual) })),
  );

  if (!confirmar) {
    // Simulação
    const investidores = await prisma.user.findMany({
      where: { id: { in: r.itens.map((i: any) => i.investidorId) } },
      select: { id: true, nome: true },
    });
    return NextResponse.json({
      ...r,
      itens: r.itens.map((i: any) => ({ ...i, nome: investidores.find((inv: any) => inv.id === i.investidorId)?.nome })),
    });
  }

  // Registrar venda
  const result = await prisma.$transaction(async (tx: any) => {
    const venda = await tx.venda.create({
      data: {
        obraId, valorVenda: r.valorVenda, custoTotal: r.custoTotal, lucro: r.lucro,
        parteGestor: r.parteGestor, parteInvestidores: r.parteInvestidores,
        createdById: user.id,
        rateios: { create: r.itens.map((i: any) => ({ obraId, investidorId: i.investidorId, percentual: i.percentual, valor: i.valor })) },
      },
    });
    await tx.obra.update({ where: { id: obraId }, data: { status: 'VENDIDA' } });
    await logAudit({
      userId: user.id, acao: 'VENDA_E_RATEIO', entidade: 'Obra', entidadeId: obraId,
      anterior: { status: obra.status }, novo: { status: 'VENDIDA', vendaId: venda.id, ...r },
      tx,
    });
    return { venda, rateio: r };
  });
  return NextResponse.json(result, { status: 201 });
}
