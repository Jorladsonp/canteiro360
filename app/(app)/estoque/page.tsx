'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { formatBRL, formatNum } from '@/lib/format';

export default function EstoquePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ obraId: '', item: '', unidade: '', quantidade: '', quantidadeMinima: '', precoUnitario: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    fetch('/api/estoque').then(r => r.json()).then(d => setItens(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); fetch('/api/obras').then(r => r.json()).then(d => setObras(d ?? [])).catch(() => {}); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch('/api/estoque', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantidade: Number(form.quantidade), quantidadeMinima: Number(form.quantidadeMinima), precoUnitario: Number(form.precoUnitario) }) });
      if (res.ok) { setShowForm(false); setForm({ obraId: '', item: '', unidade: '', quantidade: '', quantidadeMinima: '', precoUnitario: '' }); carregar(); }
    } catch {} finally { setSalvando(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Estoque</h1><p className="text-sm text-muted-foreground">Controle de materiais por obra.</p></div>
        {role === 'GESTOR' && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Novo item</button>}
      </div>

      {showForm && (
        <form onSubmit={criar} className="mb-6 rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="block text-sm font-medium mb-1">Obra *</label><select value={form.obraId} onChange={e => setForm({...form, obraId: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione...</option>{(obras ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Item *</label><input value={form.item} onChange={e => setForm({...form, item: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Unidade</label><input value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Quantidade *</label><input type="number" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Mínimo *</label><input type="number" value={form.quantidadeMinima} onChange={e => setForm({...form, quantidadeMinima: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Preço unitário *</label><input type="number" step="0.01" value={form.precoUnitario} onChange={e => setForm({...form, precoUnitario: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2"><button type="submit" disabled={salvando} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Salvar</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancelar</button></div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (itens?.length ?? 0) === 0 ? <div className="text-center py-20"><Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhum item no estoque</p></div>
        : <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Item</th><th className="px-4 py-3">Obra</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Mín</th><th className="px-4 py-3 text-right">Preço</th><th className="px-4 py-3">Status</th>
                </tr></thead>
                <tbody>{(itens ?? []).map((it: any) => {
                  const critico = (Number(it.quantidade) ?? 0) < (Number(it.quantidadeMinima) ?? 0);
                  return (
                    <tr key={it.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-3 font-medium">{it.item}</td>
                      <td className="px-4 py-3 text-muted-foreground">{it.obraNome}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNum(it.quantidade)} {it.unidade}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNum(it.quantidadeMinima)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(it.precoUnitario)}</td>
                      <td className="px-4 py-3">
                        {critico ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300"><AlertTriangle className="h-3 w-3" /> CRÍTICO</span>
                          : <span className="text-xs text-emerald-600">OK</span>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
      }
    </>
  );
}
