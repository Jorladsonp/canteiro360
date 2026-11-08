export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num, distribuirCentavos, toCents } from '@/lib/money';
import { logAudit } from '@/lib/audit';
import { inicioDoDia } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const obraId = url.searchParams.get('obraId');
  const where: any = {};
  if (obraId) where.obraId = obraId;
  if (user.role === 'INVESTIDOR') {
    where.obra = { participacoes: { some: { investidorId: user.id } } };
  }
  const gastos = await prisma.gasto.findMany({
    where,
    include: {
      obra: { select: { id: true, nome: true } },
      _count: { select: { itens: true } },
      cobrancas: user.role === 'INVESTIDOR'
        ? { where: { investidorId: user.id }, select: { valor: true, status: true } }
        : { select: { valor: true, status: true } },
    },
    orderBy: { dataEmissao: 'desc' },
    take: 500,
  });
  const result = gastos.map((g: any) => {
    const cobs = g.cobrancas ?? [];
    return {
      id: g.id, obraId: g.obraId, obraNome: g.obra?.nome, fornecedor: g.fornecedor,
      descricao: g.descricao, valor: num(g.valor), vencimento: g.vencimento,
      dataEmissao: g.dataEmissao, categoria: g.categoria, origem: g.origem,
      temComprovante: !!g.comprovanteArquivo, totalItens: g._count?.itens ?? 0,
      cobrancas: {
        total: cobs.length,
        pagas: cobs.filter((c: any) => c?.status === 'PAGO').length,
        ...(user.role === 'INVESTIDOR' && cobs[0] ? { minhaParte: num(cobs[0].valor), meuStatus: cobs[0].status } : {}),
      },
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { obraId, fornecedor, descricao, valor, vencimento, dataEmissao, categoria, origem, comprovanteArquivo, comprovanteMime, comprovantePublic, dadosOcr, itens } = body ?? {};
  if (!obraId || !fornecedor || !valor) {
    return NextResponse.json({ error: 'Campos obrigatórios: obraId, fornecedor, valor' }, { status: 400 });
  }
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  if (obra.status === 'VENDIDA') return NextResponse.json({ error: 'Obra vendida não aceita novos gastos' }, { status: 400 });

  const result = await prisma.$transaction(async (tx: any) => {
    const gasto = await tx.gasto.create({
      data: {
        obraId, fornecedor, descricao: descricao ?? null, valor: Number(valor),
        vencimento: vencimento ? new Date(vencimento) : null,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : new Date(),
        categoria: categoria ?? 'OUTROS', origem: origem ?? 'MANUAL',
        comprovanteArquivo: comprovanteArquivo ?? null, comprovanteMime: comprovanteMime ?? null,
        comprovantePublic: comprovantePublic ?? false,
        dadosOcr: dadosOcr ?? undefined, createdById: user.id,
        itens: itens?.length ? { create: itens.map((i: any) => ({ descricao: i.descricao, quantidade: Number(i.quantidade), unidade: i.unidade ?? null, precoUnitario: i.precoUnitario ? Number(i.precoUnitario) : null })) } : undefined,
      },
    });
    await tx.obra.update({ where: { id: obraId }, data: { custoTotal: { increment: Number(valor) } } });
    // Gerar cobranças proporcionais
    const parts = await tx.participacao.findMany({ where: { obraId, percentual: { gt: 0 } }, orderBy: { investidorId: 'asc' } });
    if (parts.length > 0) {
      const valores = distribuirCentavos(toCents(valor), parts.map((p: any) => num(p.percentual)));
      const hoje = inicioDoDia();
      const venc = vencimento ? new Date(vencimento) : null;
      const status = venc && venc < hoje ? 'ATRASADO' : 'PENDENTE';
      for (let i = 0; i < parts.length; i++) {
        await tx.cobranca.create({
          data: {
            gastoId: gasto.id, obraId, investidorId: parts[i].investidorId,
            valor: valores[i] / 100, percentualAplicado: parts[i].percentual,
            vencimento: venc, status,
          },
        });
      }
    }
    await logAudit({ userId: user.id, acao: 'REGISTRAR_GASTO', entidade: 'Gasto', entidadeId: gasto.id, novo: { valor: Number(valor), fornecedor }, tx });
    return gasto;
  });
  return NextResponse.json(result, { status: 201 });
}
