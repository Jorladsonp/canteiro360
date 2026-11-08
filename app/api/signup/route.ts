export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, nome, name } = body ?? {};
    const displayName = nome ?? name;
    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Campos obrigatórios: email, password, nome' }, { status: 400 });
    }
    const emailLower = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }
    const senhaHash = await bcryptjs.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        nome: String(displayName).trim(),
        email: emailLower,
        senhaHash,
        role: 'INVESTIDOR',
        ativo: true,
      },
    });
    return NextResponse.json({ id: user.id, email: user.email, nome: user.nome, role: user.role }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 });
  }
}
