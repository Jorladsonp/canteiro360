'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { HardHat, Plus } from 'lucide-react';
import { formatBRL, formatData } from '@/lib/format';

export default function EquipesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [equipes, setEquipes] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/equipes').then(r => r.json()),
      fetch('/api/escalas').then(r => r.json()),
    ]).then(([eq, es]) => { setEquipes(eq ?? []); setEscalas(es ?? []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold">Equipes</h1><p className="text-sm text-muted-foreground">Funcionários e escalas por obra.</p></div>

      {(equipes?.length ?? 0) === 0 ? <div className="text-center py-20"><HardHat className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhuma equipe cadastrada</p></div>
        : <div className="grid gap-4 md:grid-cols-2">
            {(equipes ?? []).map((eq: any) => (
              <div key={eq.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{eq.nome}</h3>
                  {eq.obraAtualNome && <span className="text-xs text-muted-foreground">Obra: {eq.obraAtualNome}</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Custo/hora: {formatBRL(eq.custoHoraEquipe)}</p>
                <div className="space-y-1">
                  {(eq.membros ?? []).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-1">
                      <div><span className="font-medium">{m.nome}</span><span className="text-muted-foreground ml-2 text-xs">{m.cargo}</span></div>
                      <span className="tabular-nums text-xs">{formatBRL(m.custoHora)}/h</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
      }

      {(escalas?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Escalas</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Equipe</th><th className="px-4 py-3">Obra</th><th className="px-4 py-3">Tarefa</th><th className="px-4 py-3">Início</th><th className="px-4 py-3">Fim</th>
                </tr></thead>
                <tbody>{(escalas ?? []).map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{e.equipeNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.obraNome ?? '—'}</td>
                    <td className="px-4 py-3">{e.tarefa}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatData(e.dataInicio)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatData(e.dataFim)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
