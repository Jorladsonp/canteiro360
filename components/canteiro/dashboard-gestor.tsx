'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle, ArrowRight, Banknote, Building2, HandCoins,
  PiggyBank, TrendingUp, Wallet,
} from 'lucide-react';
import { formatBRL, formatBRLCompacto, formatMes, formatPctNum } from '@/lib/format';
import { ObraStatusBadge } from './status-badges';

interface DashData {
  capitalCaptado: number; gastoTotal: number; margemProjetada: number;
  lucroRealizado: number; parteGestorRealizada: number; margemRealizadaPercentual: number;
  cobrancasEmAberto: { quantidade: number; valor: number; atrasadas: number; aguardandoConfirmacao: number };
  estoqueCritico: { item: string; quantidade: number; quantidadeMinima: number }[];
  obras: { id: string; nome: string; status: string; orcamentoPrevisto: number; custoTotal: number; percentualGasto: number; progressoGeral: number; etapaAtual: string }[];
}

export function DashboardGestorClient() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [d, setD] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/gestor').then(r => r.json()).then(setD).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!d) return <p className="text-center text-muted-foreground py-20">Erro ao carregar painel.</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Olá, {(user?.nome ?? user?.name ?? '').split(' ')[0]}!</h1>
        <p className="text-sm text-muted-foreground">Visão geral das suas obras e do capital dos investidores.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Capital captado', value: formatBRL(d.capitalCaptado), icon: <PiggyBank className="h-4 w-4" />, color: 'text-primary' },
          { label: 'Gasto total', value: formatBRL(d.gastoTotal), icon: <Banknote className="h-4 w-4" />, color: 'text-orange-600' },
          { label: 'Margem projetada', value: formatBRL(d.margemProjetada), icon: <TrendingUp className="h-4 w-4" />, color: 'text-emerald-600' },
          { label: 'Lucro realizado', value: formatBRL(d.lucroRealizado), icon: <HandCoins className="h-4 w-4" />, color: 'text-emerald-600' },
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link href="/cobrancas">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600"><Wallet className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Cobranças em aberto: {d.cobrancasEmAberto?.quantidade ?? 0} · {formatBRL(d.cobrancasEmAberto?.valor)}</p>
              <p className="text-xs text-muted-foreground">
                {(d.cobrancasEmAberto?.atrasadas ?? 0) > 0 && <span className="text-red-600">{d.cobrancasEmAberto.atrasadas} atrasada(s) · </span>}
                {d.cobrancasEmAberto?.aguardandoConfirmacao ?? 0} aguardando confirmação
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        <Link href="/estoque">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
            <div className="rounded-md bg-red-500/10 p-2 text-red-600"><AlertTriangle className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Estoque crítico: {d.estoqueCritico?.length ?? 0} item(ns)</p>
              <p className="truncate text-xs text-muted-foreground">
                {(d.estoqueCritico ?? []).map((e: any) => `${e.item} (${e.quantidade}/${e.quantidadeMinima})`).join(', ') || 'Nenhum item abaixo do mínimo'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      </div>

      <div className="mt-6 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Obras</h2>
          <Link href="/obras" className="text-sm text-primary hover:underline">Ver todas</Link>
        </div>
        <div className="p-4">
          {(d.obras?.length ?? 0) === 0
            ? <div className="text-center py-8"><Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p></div>
            : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(d.obras ?? []).map((o: any) => (
                  <Link key={o.id} href={`/obras/${o.id}`} className="rounded-lg border p-3 transition-colors hover:bg-accent/40">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{o.nome}</p>
                      <ObraStatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Etapa: {o.etapaAtual ?? 'N/A'}</p>
                    <div className="mt-3 space-y-2 text-xs">
                      <div>
                        <div className="mb-1 flex justify-between"><span>Progresso</span><span>{formatPctNum(o.progressoGeral)}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(o.progressoGeral ?? 0, 100)}%` }} /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between"><span>Orçamento gasto</span><span>{formatBRL(o.custoTotal)} de {formatBRL(o.orcamentoPrevisto)}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${(o.percentualGasto ?? 0) > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(o.percentualGasto ?? 0, 100)}%` }} /></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>
      </div>
    </>
  );
}
