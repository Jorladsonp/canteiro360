export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { getAuthUser, unauthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { senhaAtual, novaSenha } = await req.json();
  if (!senhaAtual || !novaSenha) {
    return NextResponse.json({ error: 'Campos obrigatórios: senhaAtual, novaSenha' }, { status: 400 });
  }
  if (String(novaSenha).length < 6) {
    return NextResponse.json({ error: 'Nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return unauthorized();
  const valid = await bcryptjs.compare(String(senhaAtual), dbUser.senhaHash);
  if (!valid) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }
  if (senhaAtual === novaSenha) {
    return NextResponse.json({ error: 'A nova senha deve ser diferente da atual' }, { status: 400 });
  }
  const hash = await bcryptjs.hash(String(novaSenha), 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: hash, firstLogin: false },
  });
  return NextResponse.json({ ok: true, message: 'Senha alterada com sucesso' });
}
