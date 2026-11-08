import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export type AuthUser = {
  id: string;
  email: string;
  nome: string;
  role: 'GESTOR' | 'INVESTIDOR';
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as AuthUser;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

export function requireGestor(user: AuthUser): NextResponse | null {
  if (user.role !== 'GESTOR') return forbidden();
  return null;
}
