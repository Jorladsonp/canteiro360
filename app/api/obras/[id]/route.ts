export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const obra = await prisma.obra.findUnique({
    where: { id },
    include: {
      etapas: { orderBy: { ordem: 'asc' } },
      participacoes: { include: { investidor: { select: { id: true, nome: true, email: true } } } },
      venda: { include: { rateios: { include: { investidor: { select: { id: true, nome: true } } } } } },
      _count: { select: { fotos: true, gastos: true } },
    },
  });
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  if (user.role === 'INVESTIDOR') {
    const part = obra.participacoes?.find((p: any) => p?.investidorId === user.id);
    if (!part) return forbidden();
  }
  return NextResponse.json({
    ...obra,
    orcamentoPrevisto: num(obra.orcamentoPrevisto),
    valorVendaEstimado: num(obra.valorVendaEstimado),
    custoTotal: num(obra.custoTotal),
    participacoes: (obra.participacoes ?? []).map((p: any) => ({
      investidorId: p.investidorId, nome: p.investidor?.nome, email: p.investidor?.email,
      totalAportado: num(p.totalAportado), percentual: num(p.percentual), updatedAt: p.updatedAt,
    })),
    venda: obra.venda ? {
      ...obra.venda, valorVenda: num(obra.venda.valorVenda), custoTotal: num(obra.venda.custoTotal),
      lucro: num(obra.venda.lucro), parteGestor: num(obra.venda.parteGestor), parteInvestidores: num(obra.venda.parteInvestidores),
      rateios: (obra.venda.rateios ?? []).map((r: any) => ({
        investidorId: r.investidorId, nome: r.investidor?.nome, percentual: num(r.percentual), valor: num(r.valor),
      })),
    } : null,
    etapas: (obra.etapas ?? []).map((e: any) => ({ id: e.id, obraId: e.obraId, nome: e.nome, ordem: e.ordem, percentualProgresso: e.percentualProgresso, dataConclusao: e.dataConclusao })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { id } = await params;
  const body = await req.json();
  const obra = await prisma.obra.update({
    where: { id },
    data: {
      ...(body.nome ? { nome: body.nome } : {}),
      ...(body.endereco ? { endereco: body.endereco } : {}),
      ...(body.descricao !== undefined ? { descricao: body.descricao } : {}),
      ...(body.orcamentoPrevisto ? { orcamentoPrevisto: Number(body.orcamentoPrevisto) } : {}),
      ...(body.valorVendaEstimado !== undefined ? { valorVendaEstimado: body.valorVendaEstimado ? Number(body.valorVendaEstimado) : null } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.dataInicio !== undefined ? { dataInicio: body.dataInicio ? new Date(body.dataInicio) : null } : {}),
      ...(body.previsaoEntrega !== undefined ? { previsaoEntrega: body.previsaoEntrega ? new Date(body.previsaoEntrega) : null } : {}),
    },
  });
  await logAudit({ userId: user.id, acao: 'EDITAR_OBRA', entidade: 'Obra', entidadeId: id });
  return NextResponse.json(obra);
}
