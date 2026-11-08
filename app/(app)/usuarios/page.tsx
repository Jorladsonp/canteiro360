'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Users } from 'lucide-react';

export default function UsuariosPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usuarios').then(r => r.json()).then(d => setUsuarios(d ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (role !== 'GESTOR') return <div className="py-20 text-center text-muted-foreground">Acesso restrito ao gestor.</div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold">Usuários</h1><p className="text-sm text-muted-foreground">Gerencie usuários do sistema.</p></div>

      {loading ? <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        : (usuarios?.length ?? 0) === 0 ? <div className="text-center py-20"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhum usuário</p></div>
        : <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody>{(usuarios ?? []).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{u.email}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'GESTOR' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>{u.role === 'GESTOR' ? 'Gestor' : 'Investidor'}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs ${u.ativo ? 'text-emerald-600' : 'text-muted-foreground'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
      }
    </>
  );
}
