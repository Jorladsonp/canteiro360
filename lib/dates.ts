export function inicioDoDia(d?: Date): Date {
  const r = d ? new Date(d) : new Date();
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

export function inicioDoMes(d?: Date): Date {
  const r = d ? new Date(d) : new Date();
  return new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 1));
}

export function inicioDoProximoMes(d?: Date): Date {
  const r = d ? new Date(d) : new Date();
  return new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 1));
}

export function addDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
