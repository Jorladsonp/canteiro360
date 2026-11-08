'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Building2, CalendarClock, Clock, Coins, HandCoins, PiggyBank, TrendingUp, Wallet,
} from 'lucide-react';
import { formatBRL, formatData, formatPct, formatPctNum } from '@/lib/format';
import { ObraStatusBadge, CobrancaStatusBadge } from './status-badges';
import { cn } from '@/lib/utils';

interface DashInv {
  valorInvestido: number; saldoAPagar: number; aguardandoConfirmacao: number;
  lucroEstimado: number; lucroRecebido: number;
  cobrancasPendentes: { id: string; obraNome: string; fornecedor: string; valor: number; vencimento?: string | null; status: string }[];
  obras: { id: string; nome: string; status: string; percentual: number; totalAportado: number; previsaoEntrega?: string | null; progressoGeral: number; etapaAtual: string }[];
  rateios: { obraNome: string; valor: number; data: string; percentual: number }[];
  timeline: { data: string; tipo: string; titulo: string; obraNome?: string }[];
}

const TL_COR: Record<string, string> = { INICIO: 'bg-sky-500', ETAPA: 'bg-emerald-500', VENDA: 'bg-violet-500', PREVISAO: 'bg-amber-500', APORTE: 'bg-primary' };

export function DashboardInvestidorClient() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [d, setD] = useState<DashInv | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/investidor').then(r => r.json()).then(setD).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!d) return <p className="text-center text-muted-foreground py-20">Erro ao carregar painel.</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Olá, {(user?.nome ?? user?.name ?? '').split(' ')[0]}!</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus investimentos, cobranças e lucros.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Valor investido', value: formatBRL(d.valorInvestido), icon: <PiggyBank className="h-4 w-4" />, color: 'text-primary' },
          { label: 'Saldo a pagar', value: formatBRL(d.saldoAPagar), icon: <Wallet className="h-4 w-4" />, color: d.saldoAPagar > 0 ? 'text-orange-600' : 'text-muted-foreground' },
          { label: 'Lucro estimado', value: formatBRL(d.lucroEstimado), icon: <TrendingUp className="h-4 w-4" />, color: 'text-emerald-600' },
          { label: 'Lucro recebido', value: formatBRL(d.lucroRecebido), icon: <HandCoins className="h-4 w-4" />, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className={s.color}>{s.icon}</span>
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Minhas obras</h2></div>
          <div className="p-4">
            {(d.obras?.length ?? 0) === 0
              ? <div className="text-center py-8"><Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Você ainda não participa de nenhuma obra.</p></div>
              : <div className="grid gap-3 sm:grid-cols-2">
                  {(d.obras ?? []).map((o: any) => (
                    <Link key={o.id} href={`/obras/${o.id}`} className="rounded-lg border p-3 transition-colors hover:bg-accent/40">
                      <div className="flex items-start justify-between gap-2"><p className="font-medium">{o.nome}</p><ObraStatusBadge status={o.status} /></div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-muted-foreground">Seu aporte</p><p className="font-semibold">{formatBRL(o.totalAportado)}</p></div>
                        <div><p className="text-muted-foreground">Participação</p><p className="font-semibold">{formatPct(o.percentual)}</p></div>
                      </div>
                      <div className="mt-3 text-xs"><div className="mb-1 flex justify-between"><span>{o.etapaAtual ?? 'N/A'}</span><span>{formatPctNum(o.progressoGeral)}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(o.progressoGeral ?? 0, 100)}%` }} /></div>
                      </div>
                      {o.previsaoEntrega && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3 w-3" /> Previsão: {formatData(o.previsaoEntrega)}</p>}
                    </Link>
                  ))}
                </div>
            }
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Cobranças pendentes</h2>
            <Link href="/cobrancas" className="text-sm text-primary hover:underline">Ver todas</Link>
          </div>
          <div className="p-4">
            {(d.cobrancasPendentes?.length ?? 0) === 0
              ? <div className="text-center py-6"><Coins className="h-6 w-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Tudo em dia!</p></div>
              : <ul className="space-y-2">
                  {(d.cobrancasPendentes ?? []).slice(0, 6).map((c: any) => (
                    <li key={c.id} className="rounded-md border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{c.fornecedor}</p><p className="text-xs text-muted-foreground">{c.obraNome} · vence {formatData(c.vencimento)}</p></div>
                        <p className="tabular-nums text-sm font-semibold">{formatBRL(c.valor)}</p>
                      </div>
                      <div className="mt-1"><CobrancaStatusBadge status={c.status} /></div>
                    </li>
                  ))}
                </ul>
            }
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Linha do tempo</h2></div>
          <div className="p-4">
            {(d.timeline?.length ?? 0) === 0
              ? <div className="text-center py-6"><Clock className="h-6 w-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Sem eventos ainda</p></div>
              : <ol className="relative ml-2 border-l pl-5">
                  {(d.timeline ?? []).slice(0, 12).map((t: any, i: number) => (
                    <li key={i} className="mb-4 last:mb-0">
                      <span className={cn('absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full', TL_COR[t.tipo] ?? 'bg-muted-foreground')} />
                      <p className="text-xs text-muted-foreground">{formatData(t.data)}{t.tipo === 'PREVISAO' && ' (previsto)'}</p>
                      <p className="text-sm font-medium">{t.titulo}</p>
                      {t.obraNome && <p className="text-xs text-muted-foreground">{t.obraNome}</p>}
                    </li>
                  ))}
                </ol>
            }
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Lucros recebidos</h2>
            <Link href="/rateios" className="text-sm text-primary hover:underline">Extrato</Link>
          </div>
          <div className="p-4">
            {(d.rateios?.length ?? 0) === 0
              ? <div className="text-center py-6"><HandCoins className="h-6 w-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Nenhum lucro recebido ainda</p></div>
              : <ul className="divide-y">
                  {(d.rateios ?? []).map((r: any, i: number) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <div><p className="font-medium">{r.obraNome}</p><p className="text-xs text-muted-foreground">Venda em {formatData(r.data)} · {formatPct(r.percentual)}</p></div>
                      <p className="tabular-nums font-semibold text-emerald-600">{formatBRL(r.valor)}</p>
                    </li>
                  ))}
                </ul>
            }
          </div>
        </div>
      </div>
    </>
  );
}
