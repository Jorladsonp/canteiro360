export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { inicioDoDia } from '@/lib/dates';

function resumoEtapas(etapas: any[]) {
  const sorted = [...(etapas ?? [])].sort((a: any, b: any) => (a?.ordem ?? 0) - (b?.ordem ?? 0));
  const total = sorted.length;
  if (!total) return { progressoGeral: 0, etapaAtual: 'Sem etapas' };
  const progressoGeral = Math.round(sorted.reduce((s: number, e: any) => s + (e?.percentualProgresso ?? 0), 0) / total);
  const atual = sorted.find((e: any) => (e?.percentualProgresso ?? 0) < 100) ?? sorted[sorted.length - 1];
  return { progressoGeral, etapaAtual: atual?.nome ?? 'Sem etapas' };
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  // Atualizar atrasadas
  await prisma.cobranca.updateMany({ where: { status: 'PENDENTE', vencimento: { lt: inicioDoDia() } }, data: { status: 'ATRASADO' } });

  const [aportes, gastos, obras, vendas, abertas, criticos, serie] = await Promise.all([
    prisma.aporte.aggregate({ _sum: { valor: true } }),
    prisma.gasto.aggregate({ _sum: { valor: true } }),
    prisma.obra.findMany({ include: { etapas: { select: { nome: true, percentualProgresso: true, ordem: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.venda.findMany({ include: { obra: { select: { nome: true } } }, orderBy: { dataVenda: 'asc' } }),
    prisma.cobranca.groupBy({ by: ['status'], where: { status: { in: ['PENDENTE', 'ATRASADO', 'PAGO_AGUARDANDO_CONFIRMACAO'] } }, _sum: { valor: true }, _count: true }),
    prisma.estoqueItem.findMany({
      where: { quantidadeMinima: { gt: 0 } },
      include: { obra: { select: { nome: true } } },
    }),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT date_trunc('month', g."dataEmissao") AS mes, g."obraId", SUM(g.valor) AS total FROM gastos g WHERE g."dataEmissao" >= date_trunc('month', NOW()) - INTERVAL '11 months' GROUP BY 1, 2 ORDER BY 1`
    ),
  ]);

  const criticosFiltered = criticos.filter((i: any) => num(i.quantidade) <= num(i.quantidadeMinima));
  const nomes = new Map(obras.map((o: any) => [o.id, o.nome]));
  const meses = new Map<string, Record<string, number | string>>();
  const hoje = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    const k = d.toISOString().slice(0, 7);
    meses.set(k, { mes: k });
  }
  for (const r of (serie ?? [])) {
    const k = new Date(r.mes).toISOString().slice(0, 7);
    const linha = meses.get(k);
    if (linha) linha[nomes.get(r.obraId) || r.obraId] = num(r.total);
  }

  const naoVendidas = obras.filter((o: any) => o.status !== 'VENDIDA');
  const faturamento = vendas.reduce((s: number, v: any) => s + num(v.valorVenda), 0);
  const lucroRealizado = vendas.reduce((s: number, v: any) => s + num(v.lucro), 0);
  const porStatus = (st: string) => abertas.find((a: any) => a.status === st);

  return NextResponse.json({
    capitalCaptado: num(aportes._sum.valor),
    gastoTotal: num(gastos._sum.valor),
    margemProjetada: naoVendidas.reduce((s: number, o: any) => s + num(o.orcamentoPrevisto) - num(o.custoTotal), 0),
    faturamento,
    lucroRealizado,
    parteGestorRealizada: vendas.reduce((s: number, v: any) => s + num(v.parteGestor), 0),
    margemRealizadaPercentual: faturamento > 0 ? Math.round((lucroRealizado / faturamento) * 1000) / 10 : 0,
    cobrancasEmAberto: {
      quantidade: abertas.reduce((s: number, a: any) => s + a._count, 0),
      valor: abertas.reduce((s: number, a: any) => s + num(a._sum.valor), 0),
      atrasadas: porStatus('ATRASADO')?._count ?? 0,
      aguardandoConfirmacao: porStatus('PAGO_AGUARDANDO_CONFIRMACAO')?._count ?? 0,
    },
    estoqueCritico: criticosFiltered.map((i: any) => ({ id: i.id, item: i.item, obraNome: i.obra?.nome, quantidade: num(i.quantidade), quantidadeMinima: num(i.quantidadeMinima), unidade: i.unidade })),
    gastoPorObraMensal: { obras: obras.map((o: any) => o.nome), serie: [...meses.values()] },
    faturamentoVsLucro: vendas.map((v: any) => ({ obra: v.obra?.nome, faturamento: num(v.valorVenda), custo: num(v.custoTotal), lucro: num(v.lucro) })),
    obras: obras.map((o: any) => {
      const orc = num(o.orcamentoPrevisto);
      const custo = num(o.custoTotal);
      return { id: o.id, nome: o.nome, status: o.status, orcamentoPrevisto: orc, custoTotal: custo, percentualGasto: orc ? Math.round((custo / orc) * 1000) / 10 : 0, ...resumoEtapas(o.etapas) };
    }),
  });
}
