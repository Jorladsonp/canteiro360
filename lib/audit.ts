import { prisma } from './prisma';

export async function logAudit(params: {
  userId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  anterior?: any;
  novo?: any;
  ip?: string | null;
  tx?: any;
}) {
  const client = params.tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId: params.userId ?? null,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      valorAnterior: params.anterior ?? undefined,
      valorNovo: params.novo ?? undefined,
      ip: params.ip ?? null,
    },
  });
}
