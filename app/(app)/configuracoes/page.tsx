'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Key } from 'lucide-react';

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErro('');
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    if (novaSenha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data?.error ?? 'Erro'); return; }
      setMsg('Senha alterada com sucesso!'); setSenhaAtual(''); setNovaSenha(''); setConfirmar('');
    } catch { setErro('Erro de conexão'); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold">Configurações</h1><p className="text-sm text-muted-foreground">Gerencie sua conta e preferências.</p></div>

      <div className="max-w-md">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Key className="h-4 w-4" /> Trocar senha</h2>
          {msg && <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{msg}</div>}
          {erro && <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{erro}</div>}
          <form onSubmit={trocarSenha} className="space-y-3">
            <div><label className="block text-sm font-medium mb-1">Senha atual</label><input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Nova senha</label><input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Confirmar nova senha</label><input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Alterar senha</button>
          </form>
        </div>
      </div>
    </>
  );
}
