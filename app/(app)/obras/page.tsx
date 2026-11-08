'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Building2, Plus, Search } from 'lucide-react';
import { formatBRL, formatPctNum } from '@/lib/format';
import { ObraStatusBadge } from '@/components/canteiro/status-badges';

export default function ObrasPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', endereco: '', descricao: '', orcamentoPrevisto: '', valorVendaEstimado: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    fetch('/api/obras').then(r => r.json()).then(d => setObras(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch('/api/obras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, orcamentoPrevisto: Number(form.orcamentoPrevisto), valorVendaEstimado: form.valorVendaEstimado ? Number(form.valorVendaEstimado) : undefined }),
      });
      if (res.ok) { setShowForm(false); setForm({ nome: '', endereco: '', descricao: '', orcamentoPrevisto: '', valorVendaEstimado: '' }); carregar(); }
    } catch {} finally { setSalvando(false); }
  };

  const filtradas = (obras ?? []).filter((o: any) => (o.nome ?? '').toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{role === 'INVESTIDOR' ? 'Minhas obras' : 'Obras'}</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as obras cadastradas.</p>
        </div>
        {role === 'GESTOR' && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Nova obra</button>}
      </div>

      {showForm && (
        <form onSubmit={criar} className="mb-6 rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Endereço *</label><input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Orçamento previsto *</label><input type="number" step="0.01" value={form.orcamentoPrevisto} onChange={e => setForm({...form, orcamentoPrevisto: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Valor venda estimado</label><input type="number" step="0.01" value={form.valorVendaEstimado} onChange={e => setForm({...form, valorVendaEstimado: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Descrição</label><textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="flex gap-2"><button type="submit" disabled={salvando} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Salvar</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancelar</button></div>
        </form>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar obra..." className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm" />
      </div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : filtradas.length === 0 ? <div className="text-center py-20"><Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhuma obra encontrada</p></div>
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((o: any) => (
              <Link key={o.id} href={`/obras/${o.id}`} className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40">
                <div className="flex items-start justify-between gap-2"><p className="font-semibold">{o.nome}</p><ObraStatusBadge status={o.status} /></div>
                <p className="mt-1 text-xs text-muted-foreground truncate">{o.endereco}</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div><div className="mb-1 flex justify-between"><span>Progresso</span><span>{formatPctNum(o.progressoGeral)}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(o.progressoGeral ?? 0, 100)}%` }} /></div></div>
                  <div><div className="mb-1 flex justify-between"><span>Custo</span><span>{formatBRL(o.custoTotal)} / {formatBRL(o.orcamentoPrevisto)}</span></div></div>
                </div>
              </Link>
            ))}
          </div>
      }
    </>
  );
}
