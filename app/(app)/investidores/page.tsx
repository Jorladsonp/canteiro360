'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Users } from 'lucide-react';
import { formatBRL, formatPct } from '@/lib/format';

export default function InvestidoresPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [invs, setInvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = () => {
    setLoading(true);
    fetch('/api/investidores').then(r => r.json()).then(d => setInvs(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true); setErro('');
    try {
      const res = await fetch('/api/investidores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setErro(d?.error ?? 'Erro'); return; }
      setShowForm(false); setForm({ nome: '', email: '', telefone: '' }); carregar();
    } catch { setErro('Erro de conexão'); } finally { setSalvando(false); }
  };

  if (role !== 'GESTOR') return <div className="py-20 text-center text-muted-foreground">Acesso restrito ao gestor.</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Investidores</h1><p className="text-sm text-muted-foreground">Gerencie investidores e seus aportes.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Novo investidor</button>
      </div>

      {showForm && (
        <form onSubmit={criar} className="mb-6 rounded-xl border bg-card p-4 shadow-sm space-y-3">
          {erro && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Telefone</label><input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <p className="text-xs text-muted-foreground">O investidor receberá uma senha provisória e deverá trocá-la no primeiro acesso.</p>
          <div className="flex gap-2"><button type="submit" disabled={salvando} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Salvar</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancelar</button></div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (invs?.length ?? 0) === 0 ? <div className="text-center py-20"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhum investidor cadastrado</p></div>
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(invs ?? []).map((inv: any) => (
              <div key={inv.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between"><p className="font-semibold">{inv.nome}</p><span className={`text-xs px-2 py-0.5 rounded-full ${inv.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{inv.ativo ? 'Ativo' : 'Inativo'}</span></div>
                <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>{inv.email}</p>
                <p className="text-sm font-medium mt-3">Total aportado: {formatBRL(inv.totalAportado)}</p>
                {(inv.participacoes?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    {(inv.participacoes ?? []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>{p.obraNome}</span>
                        <span className="tabular-nums">{formatPct(p.percentual)} · {formatBRL(p.totalAportado)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </>
  );
}
