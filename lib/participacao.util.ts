// Recálculo de participação — NÃO ALTERAR.
import { toCents, num } from './money';

export async function recalcularParticipacoes(tx: any, obraId: string) {
  const grupos = await tx.aporte.groupBy({
    by: ['investidorId'],
    where: { obraId },
    _sum: { valor: true },
  });
  const totais = grupos.map((g: any) => ({
    investidorId: g.investidorId,
    cents: toCents(g._sum.valor),
  }));
  const soma = totais.reduce((s: number, t: any) => s + t.cents, 0);
  const resultado: { investidorId: string; totalAportado: number; percentual: number }[] = [];
  for (const t of totais) {
    const percentual = soma > 0 ? Math.round((t.cents / soma) * 1e6) / 1e6 : 0;
    await tx.participacao.upsert({
      where: { obraId_investidorId: { obraId, investidorId: t.investidorId } },
      create: { obraId, investidorId: t.investidorId, totalAportado: t.cents / 100, percentual },
      update: { totalAportado: t.cents / 100, percentual },
    });
    resultado.push({ investidorId: t.investidorId, totalAportado: t.cents / 100, percentual });
  }
  return resultado;
}
