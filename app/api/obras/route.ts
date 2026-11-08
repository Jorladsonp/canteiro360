export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { logAudit } from '@/lib/audit';

function resumoEtapas(etapas: any[]) {
  const sorted = [...(etapas ?? [])].sort((a: any, b: any) => (a?.ordem ?? 0) - (b?.ordem ?? 0));
  const total = sorted.length;
  if (!total) return { progressoGeral: 0, etapaAtual: 'Sem etapas' };
  const progressoGeral = Math.round(sorted.reduce((s: number, e: any) => s + (e?.percentualProgresso ?? 0), 0) / total);
  const atual = sorted.find((e: any) => (e?.percentualProgresso ?? 0) < 100) ?? sorted[sorted.length - 1];
  return { progressoGeral, etapaAtual: atual?.nome ?? 'Sem etapas' };
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const where = user.role === 'INVESTIDOR'
    ? { participacoes: { some: { investidorId: user.id } } }
    : {};
  const obras = await prisma.obra.findMany({
    where,
    include: {
      etapas: { select: { nome: true, percentualProgresso: true, ordem: true } },
      _count: { select: { fotos: true, participacoes: true } },
      participacoes: user.role === 'INVESTIDOR'
        ? { where: { investidorId: user.id }, select: { totalAportado: true, percentual: true } }
        : { select: { totalAportado: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const result = obras.map((o: any) => {
    const orc = num(o.orcamentoPrevisto);
    const custo = num(o.custoTotal);
    const totalAportado = (o.participacoes ?? []).reduce((s: number, p: any) => s + num(p?.totalAportado), 0);
    return {
      id: o.id, nome: o.nome, endereco: o.endereco, descricao: o.descricao,
      status: o.status, orcamentoPrevisto: orc, valorVendaEstimado: num(o.valorVendaEstimado),
      custoTotal: custo, percentualGasto: orc ? Math.round((custo / orc) * 1000) / 10 : 0,
      dataInicio: o.dataInicio, previsaoEntrega: o.previsaoEntrega,
      totalAportado, numInvestidores: o._count?.participacoes ?? 0, totalFotos: o._count?.fotos ?? 0,
      ...resumoEtapas(o.etapas), createdAt: o.createdAt,
      ...(user.role === 'INVESTIDOR' && o.participacoes?.[0]
        ? { minhaParticipacao: { totalAportado: num(o.participacoes[0].totalAportado), percentual: num(o.participacoes[0].percentual) } }
        : {}),
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { nome, endereco, descricao, orcamentoPrevisto, valorVendaEstimado, dataInicio, previsaoEntrega, etapas } = body ?? {};
  if (!nome || !endereco || !orcamentoPrevisto) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, endereco, orcamentoPrevisto' }, { status: 400 });
  }
  const obra = await prisma.obra.create({
    data: {
      nome, endereco, descricao: descricao ?? null,
      orcamentoPrevisto: Number(orcamentoPrevisto),
      valorVendaEstimado: valorVendaEstimado ? Number(valorVendaEstimado) : null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
      etapas: etapas?.length ? { create: etapas.map((e: any, i: number) => ({ nome: e.nome, ordem: i })) } : undefined,
    },
  });
  await logAudit({ userId: user.id, acao: 'CRIAR_OBRA', entidade: 'Obra', entidadeId: obra.id, novo: { nome, endereco } });
  return NextResponse.json(obra, { status: 201 });
}
