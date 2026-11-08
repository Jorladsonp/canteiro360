'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ScrollText } from 'lucide-react';
import { formatDataHora } from '@/lib/format';

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const carregar = (p: number) => {
    setLoading(true);
    fetch(`/api/auditoria?page=${p}&limit=20`).then(r => r.json()).then(d => {
      setLogs(d?.data ?? d ?? []);
      setTotal(d?.total ?? 0);
      setPage(p);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(1); }, []);

  if (role !== 'GESTOR') return <div className="py-20 text-center text-muted-foreground">Acesso restrito ao gestor.</div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold">Auditoria</h1><p className="text-sm text-muted-foreground">Log de ações do sistema.</p></div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (logs?.length ?? 0) === 0 ? <div className="text-center py-20"><ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhum registro</p></div>
        : <>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Data</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Entidade</th>
                  </tr></thead>
                  <tbody>{(logs ?? []).map((l: any) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" suppressHydrationWarning>{formatDataHora(l.createdAt)}</td>
                      <td className="px-4 py-3">{l.userName ?? l.userId}</td>
                      <td className="px-4 py-3 font-medium">{l.acao}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.entidade} {l.entidadeId ? `(${(l.entidadeId ?? '').slice(0, 8)}...)` : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{total} registros</p>
              <div className="flex gap-2">
                <button onClick={() => carregar(page - 1)} disabled={page <= 1} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">Anterior</button>
                <button onClick={() => carregar(page + 1)} disabled={(logs?.length ?? 0) < 20} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">Próxima</button>
              </div>
            </div>
          </>
      }
    </>
  );
}
