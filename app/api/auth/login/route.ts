export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }
}
