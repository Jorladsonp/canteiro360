'use client';

import { cn } from '@/lib/utils';
import { STATUS_OBRA, STATUS_COBRANCA } from '@/lib/format';

const obraCores: Record<string, string> = {
  PLANEJAMENTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  EM_EXECUCAO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CONCLUIDA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  VENDIDA: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
};

const cobrancaCores: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PAGO_AGUARDANDO_CONFIRMACAO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PAGO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  ATRASADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function ObraStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', obraCores[status] ?? 'bg-muted text-muted-foreground')}>
      {STATUS_OBRA[status] ?? status}
    </span>
  );
}

export function CobrancaStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cobrancaCores[status] ?? 'bg-muted text-muted-foreground')}>
      {STATUS_COBRANCA[status] ?? status}
    </span>
  );
}
