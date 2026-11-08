// Funções monetárias imutáveis — NÃO ALTERAR a lógica.

type Num = { toString(): string } | number | string | null | undefined;

export function toCents(v: Num): number {
  if (v === null || v === undefined) return 0;
  return Math.round(Number(v.toString()) * 100);
}

export function fromCents(c: number): number {
  return Math.round(c) / 100;
}

export function num(v: Num): number {
  if (v === null || v === undefined) return 0;
  return Number(v.toString());
}

/**
 * Distribui um total em centavos proporcionalmente aos pesos (método do maior resto),
 * garantindo que a soma das partes seja exatamente igual ao total.
 */
export function distribuirCentavos(totalCents: number, pesos: number[]): number[] {
  const somaPesos = pesos.reduce((a: number, b: number) => a + b, 0);
  if (somaPesos <= 0) return pesos.map(() => 0);
  const sinal = totalCents < 0 ? -1 : 1;
  const abs = Math.abs(totalCents);
  const brutos = pesos.map((p: number) => (abs * p) / somaPesos);
  const partes = brutos.map((b: number) => Math.floor(b));
  let resto = abs - partes.reduce((a: number, b: number) => a + b, 0);
  const ordem = brutos.map((b: number, i: number) => ({ i, frac: b - Math.floor(b) })).sort((a: any, b: any) => b.frac - a.frac);
  for (let k = 0; resto > 0 && k < ordem.length; k++, resto--) partes[ordem[k].i] += 1;
  return partes.map((p: number) => p * sinal);
}

export function formatBRL(v: Num): string {
  return num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
