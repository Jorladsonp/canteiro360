export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const url = new URL(req.url);
  const obraId = url.searchParams.get('obraId');
  const itens = await prisma.estoqueItem.findMany({
    where: obraId ? { obraId } : {},
    include: { obra: { select: { id: true, nome: true } } },
    orderBy: { item: 'asc' },
  });
  return NextResponse.json(itens.map((i: any) => {
    const qty = num(i.quantidade);
    const min = num(i.quantidadeMinima);
    const price = num(i.precoUnitario);
    return {
      id: i.id, obraId: i.obraId, obraNome: i.obra?.nome, item: i.item,
      unidade: i.unidade, quantidade: qty, quantidadeMinima: min,
      precoUnitario: price, valorTotal: Math.round(qty * price * 100) / 100,
      critico: qty <= min && min > 0, updatedAt: i.updatedAt,
    };
  }));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { obraId, item, unidade, quantidade, quantidadeMinima, precoUnitario } = body ?? {};
  if (!obraId || !item) return NextResponse.json({ error: 'Campos obrigatórios: obraId, item' }, { status: 400 });
  const created = await prisma.estoqueItem.create({
    data: {
      obraId, item, unidade: unidade ?? 'un',
      quantidade: Number(quantidade ?? 0), quantidadeMinima: Number(quantidadeMinima ?? 0),
      precoUnitario: Number(precoUnitario ?? 0),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
