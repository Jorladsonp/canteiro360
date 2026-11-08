export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.estoqueItem.update({
    where: { id },
    data: {
      ...(body.item ? { item: body.item } : {}),
      ...(body.unidade ? { unidade: body.unidade } : {}),
      ...(body.quantidade !== undefined ? { quantidade: Number(body.quantidade) } : {}),
      ...(body.quantidadeMinima !== undefined ? { quantidadeMinima: Number(body.quantidadeMinima) } : {}),
      ...(body.precoUnitario !== undefined ? { precoUnitario: Number(body.precoUnitario) } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { id } = await params;
  await prisma.estoqueItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
