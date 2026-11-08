'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Receipt, Search } from 'lucide-react';
import { formatBRL, formatData, CATEGORIAS } from '@/lib/format';
import { CobrancaStatusBadge } from '@/components/canteiro/status-badges';

export default function GastosPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [obras, setObras] = useState<any[]>([]);
  const [form, setForm] = useState({ obraId: '', fornecedor: '', descricao: '', valor: '', categoria: 'MATERIAL', origem: 'NOTA_FISCAL', dataEmissao: '', vencimento: '' });
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);

  const carregar = () => {
    setLoading(true);
    fetch('/api/gastos').then(r => r.json()).then(d => setGastos(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); fetch('/api/obras').then(r => r.json()).then(d => setObras(d ?? [])).catch(() => {}); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valor: Number(form.valor) }),
      });
      if (res.ok) { setShowForm(false); setForm({ obraId: '', fornecedor: '', descricao: '', valor: '', categoria: 'MATERIAL', origem: 'NOTA_FISCAL', dataEmissao: '', vencimento: '' }); carregar(); }
    } catch {} finally { setSalvando(false); }
  };

  const verDetalhe = async (id: string) => {
    try {
      const res = await fetch(`/api/gastos/${id}`);
      const d = await res.json();
      setDetalhe(d);
    } catch {}
  };

  const filtrados = (gastos ?? []).filter((g: any) => (g.fornecedor ?? '').toLowerCase().includes(busca.toLowerCase()) || (g.descricao ?? '').toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Gastos</h1><p className="text-sm text-muted-foreground">Registro de gastos das obras.</p></div>
        {role === 'GESTOR' && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Novo gasto</button>}
      </div>

      {showForm && (
        <form onSubmit={criar} className="mb-6 rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="block text-sm font-medium mb-1">Obra *</label><select value={form.obraId} onChange={e => setForm({...form, obraId: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione...</option>{(obras ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Fornecedor *</label><input value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Valor *</label><input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Categoria</label><select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Data emissão</label><input type="date" value={form.dataEmissao} onChange={e => setForm({...form, dataEmissao: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Vencimento</label><input type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Descrição</label><textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="flex gap-2"><button type="submit" disabled={salvando} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Salvar</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">Cancelar</button></div>
        </form>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar gasto..." className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm" />
      </div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : filtrados.length === 0 ? <div className="text-center py-20"><Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhum gasto encontrado</p></div>
        : <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">Obra</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Vencimento</th>
                </tr></thead>
                <tbody>{filtrados.map((g: any) => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-accent/30 cursor-pointer" onClick={() => verDetalhe(g.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{g.fornecedor}</p>
                      {g.descricao && <p className="text-xs text-muted-foreground truncate max-w-xs">{g.descricao}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{g.obraNome}</td>
                    <td className="px-4 py-3">{CATEGORIAS[g.categoria as string] ?? g.categoria}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatBRL(g.valor)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatData(g.vencimento)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
      }

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetalhe(null)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">{detalhe.fornecedor}</h2>
            <p className="text-sm text-muted-foreground mb-4">{detalhe.obraNome} · {CATEGORIAS[detalhe.categoria as string] ?? detalhe.categoria}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-muted-foreground text-xs">Valor</p><p className="font-semibold tabular-nums">{formatBRL(detalhe.valor)}</p></div>
              <div><p className="text-muted-foreground text-xs">Vencimento</p><p>{formatData(detalhe.vencimento)}</p></div>
              <div><p className="text-muted-foreground text-xs">Emissão</p><p>{formatData(detalhe.dataEmissao)}</p></div>
            </div>
            {detalhe.descricao && <p className="text-sm text-muted-foreground mb-4">{detalhe.descricao}</p>}
            {(detalhe.itens?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Itens</p>
                <table className="w-full text-xs"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-1">Descrição</th><th className="pb-1">Qtd</th><th className="pb-1 text-right">Total</th></tr></thead>
                  <tbody>{(detalhe.itens ?? []).map((it: any, i: number) => (
                    <tr key={i} className="border-b last:border-0"><td className="py-1">{it.descricao}</td><td className="py-1">{it.quantidade} {it.unidade}</td><td className="py-1 text-right tabular-nums">{it.precoUnitario != null ? formatBRL(it.precoUnitario * it.quantidade) : '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {(detalhe.cobrancas?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Cobranças</p>
                <div className="space-y-1">
                  {(detalhe.cobrancas ?? []).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-xs border rounded-md p-2">
                      <span>{c.investidorNome}</span>
                      <span className="tabular-nums font-medium">{formatBRL(c.valor)}</span>
                      <CobrancaStatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setDetalhe(null)} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
