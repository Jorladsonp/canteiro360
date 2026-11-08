export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-helpers';
import { num } from '@/lib/money';
import bcryptjs from 'bcryptjs';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const investidores = await prisma.user.findMany({
    where: { role: 'INVESTIDOR' },
    include: {
      participacoes: { include: { obra: { select: { id: true, nome: true } } } },
    },
    orderBy: { nome: 'asc' },
  });
  return NextResponse.json(investidores.map((inv: any) => ({
    id: inv.id, nome: inv.nome, email: inv.email, telefone: inv.telefone,
    ativo: inv.ativo, firstLogin: inv.firstLogin, createdAt: inv.createdAt,
    participacoes: (inv.participacoes ?? []).map((p: any) => ({
      obraId: p.obraId, obraNome: p.obra?.nome, totalAportado: num(p.totalAportado), percentual: num(p.percentual),
    })),
    totalAportado: (inv.participacoes ?? []).reduce((s: number, p: any) => s + num(p.totalAportado), 0),
  })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (user.role !== 'GESTOR') return forbidden();
  const body = await req.json();
  const { nome, email, telefone, senha } = body ?? {};
  if (!nome || !email || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, email, senha' }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (exists) return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
  const senhaHash = await bcryptjs.hash(String(senha), 10);
  const inv = await prisma.user.create({
    data: {
      nome: String(nome).trim(),
      email: String(email).toLowerCase().trim(),
      telefone: telefone ?? null,
      senhaHash,
      role: 'INVESTIDOR',
      firstLogin: true,
    },
  });
  await logAudit({ userId: user.id, acao: 'CRIAR_INVESTIDOR', entidade: 'User', entidadeId: inv.id, novo: { nome: inv.nome, email: inv.email } });
  return NextResponse.json({ id: inv.id, nome: inv.nome, email: inv.email }, { status: 201 });
}
