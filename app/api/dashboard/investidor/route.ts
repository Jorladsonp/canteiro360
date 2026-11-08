export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { inicioDoDia } from '@/lib/dates';
import { PERCENTUAL_INVESTIDORES } from '@/lib/rateio.calc';

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
  if (user.role !== 'INVESTIDOR') {
    return NextResponse.json({ error: 'Apenas investidores' }, { status: 403 });
  }
  await prisma.cobranca.updateMany({ where: { status: 'PENDENTE', vencimento: { lt: inicioDoDia() } }, data: { status: 'ATRASADO' } });

  const [parts, pendentes, rateios, aportes] = await Promise.all([
    prisma.participacao.findMany({
      where: { investidorId: user.id },
      include: { obra: { include: { etapas: { orderBy: { ordem: 'asc' } }, venda: true } } },
    }),
    prisma.cobranca.findMany({
      where: { investidorId: user.id, status: { in: ['PENDENTE', 'ATRASADO', 'PAGO_AGUARDANDO_CONFIRMACAO'] } },
      include: { obra: { select: { nome: true } }, gasto: { select: { fornecedor: true } } },
      orderBy: { vencimento: 'asc' },
    }),
    prisma.rateioItem.findMany({ where: { investidorId: user.id }, include: { obra: { select: { nome: true } }, venda: { select: { dataVenda: true } } } }),
    prisma.aporte.findMany({ where: { investidorId: user.id }, include: { obra: { select: { nome: true } } }, orderBy: { data: 'desc' } }),
  ]);

  const lucroEstimado = parts
    .filter((p: any) => p.obra?.status !== 'VENDIDA' && p.obra?.valorVendaEstimado)
    .reduce((s: number, p: any) => s + (num(p.obra?.valorVendaEstimado) - Math.max(num(p.obra?.orcamentoPrevisto), num(p.obra?.custoTotal))) * PERCENTUAL_INVESTIDORES * num(p.percentual), 0);

  const timeline: any[] = [];
  for (const p of parts) {
    if (p.obra?.dataInicio) timeline.push({ data: p.obra.dataInicio, tipo: 'INICIO', titulo: 'Início da obra', obraNome: p.obra.nome });
    for (const e of (p.obra?.etapas ?? [])) {
      if (e.dataConclusao) timeline.push({ data: e.dataConclusao, tipo: 'ETAPA', titulo: `Etapa concluída: ${e.nome}`, obraNome: p.obra?.nome });
    }
    if (p.obra?.venda) timeline.push({ data: p.obra.venda.dataVenda, tipo: 'VENDA', titulo: 'Obra vendida', obraNome: p.obra.nome });
    if (p.obra?.previsaoEntrega && p.obra?.status !== 'VENDIDA')
      timeline.push({ data: p.obra.previsaoEntrega, tipo: 'PREVISAO', titulo: 'Previsão de entrega', obraNome: p.obra.nome });
  }
  for (const a of aportes) {
    timeline.push({ data: a.data, tipo: 'APORTE', titulo: `Aporte de ${num(a.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, obraNome: a.obra?.nome });
  }
  timeline.sort((a: any, b: any) => +new Date(b.data) - +new Date(a.data));

  return NextResponse.json({
    valorInvestido: aportes.reduce((s: number, a: any) => s + num(a.valor), 0),
    saldoAPagar: pendentes.filter((c: any) => c.status !== 'PAGO_AGUARDANDO_CONFIRMACAO').reduce((s: number, c: any) => s + num(c.valor), 0),
    aguardandoConfirmacao: pendentes.filter((c: any) => c.status === 'PAGO_AGUARDANDO_CONFIRMACAO').reduce((s: number, c: any) => s + num(c.valor), 0),
    lucroEstimado: Math.round(lucroEstimado * 100) / 100,
    lucroRecebido: rateios.reduce((s: number, r: any) => s + num(r.valor), 0),
    cobrancasPendentes: pendentes.map((c: any) => ({ id: c.id, obraNome: c.obra?.nome, fornecedor: c.gasto?.fornecedor, valor: num(c.valor), vencimento: c.vencimento, status: c.status })),
    obras: parts.map((p: any) => ({
      id: p.obra?.id, nome: p.obra?.nome, status: p.obra?.status, percentual: num(p.percentual), totalAportado: num(p.totalAportado),
      previsaoEntrega: p.obra?.previsaoEntrega, ...resumoEtapas(p.obra?.etapas ?? []),
    })),
    rateios: rateios.map((r: any) => ({ obraNome: r.obra?.nome, valor: num(r.valor), percentual: num(r.percentual), data: r.venda?.dataVenda })),
    timeline: timeline.slice(0, 30),
  });
}
