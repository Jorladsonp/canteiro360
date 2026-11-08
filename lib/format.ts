'use client';

export function formatBRL(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatBRLCompacto(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 } as any);
}

export function formatData(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatDataHora(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const toInputDate = (d: string | null | undefined) => (d ? d.slice(0, 10) : '');
export const hojeInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const formatPct = (fracao: number | null | undefined, casas = 2) =>
  `${((Number(fracao) || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })}%`;

export const formatPctNum = (v: number | null | undefined) =>
  `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const formatNum = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export function parseNumero(s: string | number): number {
  if (typeof s === 'number') return s;
  const t = s.trim().replace(/[R$\s]/g, '');
  if (!t) return NaN;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(norm);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const formatMes = (ym: string) => { const [y, m] = (ym ?? '').split('-'); return m ? `${MESES[Number(m) - 1]}/${(y ?? '').slice(2)}` : ym ?? ''; };

export const STATUS_OBRA: Record<string, string> = { PLANEJAMENTO: 'Planejamento', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', VENDIDA: 'Vendida' };
export const STATUS_COBRANCA: Record<string, string> = { PENDENTE: 'Pendente', PAGO_AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação', PAGO: 'Pago', ATRASADO: 'Atrasado' };
export const CATEGORIAS: Record<string, string> = {
  MATERIAL: 'Material', MAO_DE_OBRA: 'Mão de obra', SERVICO: 'Serviço', EQUIPAMENTO: 'Equipamento', TAXAS_LICENCAS: 'Taxas e licenças', PROJETO: 'Projeto', OUTROS: 'Outros',
};
export const ORIGENS: Record<string, string> = { NOTA_FISCAL: 'Nota fiscal', BOLETO: 'Boleto', MAO_DE_OBRA: 'Mão de obra', MANUAL: 'Manual' };
