// Regra de rateio 30/70 — NÃO ALTERAR.
import { distribuirCentavos } from './money';

export const PERCENTUAL_GESTOR = 0.3;
export const PERCENTUAL_INVESTIDORES = 0.7;

export function calcularRateio(
  valorVenda: number,
  custoTotal: number,
  participacoes: { investidorId: string; percentual: number }[],
) {
  const vendaC = Math.round(valorVenda * 100);
  const custoC = Math.round(custoTotal * 100);
  const lucroC = vendaC - custoC;
  const gestorC = Math.round(lucroC * PERCENTUAL_GESTOR);
  const investidoresC = lucroC - gestorC;
  const partes = distribuirCentavos(
    investidoresC,
    participacoes.map((p: any) => p.percentual),
  );
  return {
    valorVenda: vendaC / 100,
    custoTotal: custoC / 100,
    lucro: lucroC / 100,
    parteGestor: gestorC / 100,
    parteInvestidores: investidoresC / 100,
    itens: participacoes.map((p: any, i: number) => ({
      investidorId: p.investidorId,
      percentual: p.percentual,
      valor: partes[i] / 100,
    })),
  };
}
