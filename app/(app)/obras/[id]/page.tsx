'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Building2, MapPin, Users, DollarSign, TrendingUp } from 'lucide-react';
import { formatBRL, formatData, formatPct, formatPctNum } from '@/lib/format';
import { ObraStatusBadge } from '@/components/canteiro/status-badges';
import Link from 'next/link';

export default function ObraDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/obras/${params.id}`).then(r => r.json()).then(setObra).catch(() => {}).finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!obra) return <p className="text-center text-muted-foreground py-20">Obra não encontrada.</p>;

  return (
    <>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold">{obra.nome}</h1><ObraStatusBadge status={obra.status} /></div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" />{obra.endereco}</p>
          {obra.descricao && <p className="text-sm text-muted-foreground mt-2">{obra.descricao}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground mb-1">Orçamento</p><p className="font-bold">{formatBRL(obra.orcamentoPrevisto)}</p></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground mb-1">Custo atual</p><p className="font-bold">{formatBRL(obra.custoTotal)}</p></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground mb-1">Total aportado</p><p className="font-bold">{formatBRL(obra.totalAportado)}</p></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground mb-1">Progresso</p><p className="font-bold">{formatPctNum(obra.progressoGeral)}</p></div>
      </div>

      {obra.etapas && (obra.etapas?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-card shadow-sm mb-6">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Etapas</h2></div>
          <div className="p-4 space-y-3">
            {(obra.etapas ?? []).map((et: any) => (
              <div key={et.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm"><span>{et.nome}</span><span className="tabular-nums">{et.percentualProgresso ?? 0}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${et.percentualProgresso ?? 0}%` }} /></div>
                </div>
                {et.dataConclusao && <span className="text-xs text-muted-foreground whitespace-nowrap">{formatData(et.dataConclusao)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {role === 'GESTOR' && obra.investidores && (obra.investidores?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-card shadow-sm mb-6">
          <div className="border-b px-4 py-3"><h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Investidores</h2></div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Nome</th><th className="pb-2">Aportado</th><th className="pb-2">Participação</th></tr></thead>
                <tbody>{(obra.investidores ?? []).map((inv: any) => (
                  <tr key={inv.investidorId} className="border-b last:border-0"><td className="py-2 font-medium">{inv.nome}</td><td className="py-2 tabular-nums">{formatBRL(inv.totalAportado)}</td><td className="py-2">{formatPct(inv.percentual)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {obra.minhaParticipacao && (
        <div className="rounded-xl border bg-card shadow-sm mb-6">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Minha participação</h2></div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Total aportado</p><p className="font-bold">{formatBRL(obra.minhaParticipacao?.totalAportado)}</p></div>
            <div><p className="text-muted-foreground">Participação</p><p className="font-bold">{formatPct(obra.minhaParticipacao?.percentual)}</p></div>
          </div>
        </div>
      )}
    </>
  );
}
