export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const { id } = await params;
  const { etapas } = await req.json();
  if (!Array.isArray(etapas)) return NextResponse.json({ error: 'etapas deve ser um array' }, { status: 400 });
  const result = [];
  for (const e of etapas) {
    if (e.id) {
      const updated = await prisma.etapa.update({
        where: { id: e.id },
        data: { nome: e.nome, ordem: e.ordem ?? 0, percentualProgresso: e.percentualProgresso ?? 0, dataConclusao: e.dataConclusao ? new Date(e.dataConclusao) : null },
      });
      result.push(updated);
    } else {
      const created = await prisma.etapa.create({
        data: { obraId: id, nome: e.nome, ordem: e.ordem ?? 0, percentualProgresso: e.percentualProgresso ?? 0 },
      });
      result.push(created);
    }
  }
  return NextResponse.json(result);
}
