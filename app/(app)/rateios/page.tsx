'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart } from 'lucide-react';
import { formatBRL, formatData, formatPct } from '@/lib/format';

export default function RateiosPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rateio').then(r => r.json()).then(d => setVendas(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{role === 'INVESTIDOR' ? 'Extrato de lucros' : 'Vendas e rateios'}</h1>
        <p className="text-sm text-muted-foreground">Histórico de vendas com distribuição de lucros (30% gestor / 70% investidores).</p>
      </div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (vendas?.length ?? 0) === 0 ? <div className="text-center py-20"><PieChart className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhuma venda registrada</p></div>
        : <div className="space-y-4">
            {(vendas ?? []).map((v: any) => (
              <div key={v.obraId ?? v.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold">{v.obraNome}</h3><p className="text-xs text-muted-foreground">Venda em {formatData(v.dataVenda)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-sm mb-3">
                  <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-semibold tabular-nums">{formatBRL(v.valorVenda)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Custo</p><p className="font-semibold tabular-nums">{formatBRL(v.custoTotal)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Lucro</p><p className="font-semibold tabular-nums text-emerald-600">{formatBRL(v.lucro)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Gestor (30%)</p><p className="tabular-nums">{formatBRL(v.parteGestor)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Investidores (70%)</p><p className="tabular-nums">{formatBRL(v.parteInvestidores)}</p></div>
                </div>
                {(v.itens?.length ?? 0) > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Distribuição</p>
                    <div className="space-y-1">
                      {(v.itens ?? []).map((it: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{it.nome ?? it.investidorId}</span>
                          <span className="tabular-nums">{formatPct(it.percentual)} → <span className="font-semibold text-emerald-600">{formatBRL(it.valor)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </>
  );
}
