'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, CheckCircle2, Wallet, X } from 'lucide-react';
import { formatBRL, formatData, formatPct, STATUS_COBRANCA } from '@/lib/format';
import { CobrancaStatusBadge } from '@/components/canteiro/status-badges';

const ABERTAS = 'PENDENTE,ATRASADO,PAGO_AGUARDANDO_CONFIRMACAO';

export default function CobrancasPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const gestor = role === 'GESTOR';
  const [status, setStatus] = useState(gestor ? 'PAGO_AGUARDANDO_CONFIRMACAO' : 'abertas');
  const [obraId, setObraId] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<any[]>([]);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status === 'abertas') qs.set('status', ABERTAS);
    else if (status) qs.set('status', status);
    if (obraId) qs.set('obraId', obraId);
    fetch(`/api/cobrancas?${qs}`).then(r => r.json()).then(d => setData(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [status, obraId]);
  useEffect(() => { fetch('/api/obras').then(r => r.json()).then(d => setObras(d ?? [])).catch(() => {}); }, []);

  const totais = useMemo(() => {
    const l = data ?? [];
    const soma = (f: (c: any) => boolean) => l.filter(f).reduce((s: number, c: any) => s + Number(c.valor ?? 0), 0);
    return { total: soma(() => true), aberto: soma((c: any) => c.status === 'PENDENTE' || c.status === 'ATRASADO'), pago: soma((c: any) => c.status === 'PAGO') };
  }, [data]);

  const executar = async (c: any, tipo: string) => {
    const map: Record<string, string> = { paguei: 'informar_pagamento', confirmar: 'confirmar', rejeitar: 'rejeitar' };
    if (!confirm(tipo === 'paguei' ? `Confirma que pagou ${formatBRL(c.valor)}?` : tipo === 'confirmar' ? `Confirmar recebimento de ${formatBRL(c.valor)}?` : `Rejeitar pagamento de ${formatBRL(c.valor)}?`)) return;
    setAcao(c.id + tipo);
    try {
      await fetch(`/api/cobrancas/${c.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: map[tipo] }),
      });
      carregar();
    } catch {} finally { setAcao(null); }
  };

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold">Cobranças</h1><p className="text-sm text-muted-foreground">Gerencie as cobranças de gastos por obra.</p></div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="abertas">Em aberto</option>
          {Object.entries(STATUS_COBRANCA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="">Todas</option>
        </select>
        <select value={obraId} onChange={e => setObraId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas as obras</option>
          {(obras ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <div className="ml-auto text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatBRL(totais.total)}</span>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (data?.length ?? 0) === 0 ? <div className="text-center py-20"><Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhuma cobrança encontrada</p></div>
        : <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Obra</th>
                  {gestor && <th className="px-4 py-3">Investidor</th>}
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr></thead>
                <tbody>{(data ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{c.fornecedor}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.obraNome}</td>
                    {gestor && <td className="px-4 py-3 text-muted-foreground">{c.investidorNome}</td>}
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatBRL(c.valor)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatData(c.vencimento)}</td>
                    <td className="px-4 py-3"><CobrancaStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!gestor && (c.status === 'PENDENTE' || c.status === 'ATRASADO') && (
                          <button disabled={acao === c.id + 'paguei'} onClick={() => executar(c, 'paguei')} className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
                            <Check className="h-3 w-3" /> Paguei
                          </button>
                        )}
                        {gestor && c.status === 'PAGO_AGUARDANDO_CONFIRMACAO' && <>
                          <button disabled={acao === c.id + 'confirmar'} onClick={() => executar(c, 'confirmar')} className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Confirmar</button>
                          <button disabled={acao === c.id + 'rejeitar'} onClick={() => executar(c, 'rejeitar')} className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"><X className="h-3 w-3" /> Rejeitar</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
      }
    </>
  );
}
