'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { HardHat, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password: senha, confirmPassword: confirmar }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data?.error || 'Erro ao criar conta.'); return; }
      const login = await signIn('credentials', { email, password: senha, redirect: false });
      if (login?.error) { setErro('Conta criada, mas erro ao entrar. Tente fazer login.'); return; }
      router.replace('/');
    } catch {
      setErro('Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HardHat className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight">Canteiro</span>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-1">Criar conta</h1>
          <p className="text-sm text-muted-foreground mb-6">Cadastre-se como gestor para começar a gerenciar suas obras.</p>
          {erro && <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{erro}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1.5">Nome completo</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Seu nome" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Senha</label><input type="password" value={senha} onChange={e => setSenha(e.target.value)} required placeholder="Mínimo 6 caracteres" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Confirmar senha</label><input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required placeholder="Repita a senha" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <UserPlus className="h-4 w-4" />}
              Criar conta
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Já tem conta? <Link href="/login" className="text-primary hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
