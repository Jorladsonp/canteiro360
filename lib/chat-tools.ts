import { prisma } from './prisma';
import { num, formatBRL, formatData, distribuirCentavos, toCents } from './money';
import { inicioDoDia, inicioDoMes, inicioDoProximoMes, addDias } from './dates';
import type { AuthUser } from './auth-helpers';

const pct = (v: number) => `${(v * 100).toFixed(2).replace('.', ',')}%`;
const STATUS_OBRA: Record<string, string> = { PLANEJAMENTO: 'Planejamento', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', VENDIDA: 'Vendida' };
const STATUS_COB: Record<string, string> = { PENDENTE: 'Pendente', ATRASADO: 'Atrasada', PAGO_AGUARDANDO_CONFIRMACAO: 'Pago (aguardando confirmação)', PAGO: 'Paga' };

function resumoEtapas(etapas: any[]) {
  const sorted = [...(etapas ?? [])].sort((a: any, b: any) => (a?.ordem ?? 0) - (b?.ordem ?? 0));
  if (!sorted.length) return { progressoGeral: 0, etapaAtual: 'Sem etapas' };
  const progressoGeral = Math.round(sorted.reduce((s: number, e: any) => s + (e?.percentualProgresso ?? 0), 0) / sorted.length);
  const atual = sorted.find((e: any) => (e?.percentualProgresso ?? 0) < 100) ?? sorted[sorted.length - 1];
  return { progressoGeral, etapaAtual: atual?.nome ?? 'Sem etapas' };
}

function filtroNome(obra?: string): any {
  return obra ? { nome: { contains: obra, mode: 'insensitive' } } : {};
}

function minhasObrasWhere(user: AuthUser, obra?: string): any {
  if (user.role === 'GESTOR') return filtroNome(obra);
  return { participacoes: { some: { investidorId: user.id } }, ...filtroNome(obra) };
}

export function getToolDefinitions(role: string) {
  const semParams = { type: 'object' as const, properties: {} as Record<string, any>, additionalProperties: false };
  const paramObra = { type: 'object' as const, properties: { obra: { type: 'string', description: 'Nome (ou parte do nome) da obra. Opcional.' } } };
  if (role === 'GESTOR') {
    return [
      { type: 'function' as const, function: { name: 'status_obras', description: 'Lista todas as obras com status, % gasto e progresso.', parameters: semParams } },
      { type: 'function' as const, function: { name: 'gasto_mes', description: 'Soma dos gastos de um mês por obra.', parameters: { type: 'object' as const, properties: { mes: { type: 'string', description: 'Mês AAAA-MM. Opcional.' } } } } },
      { type: 'function' as const, function: { name: 'estoque_baixo', description: 'Itens de estoque com quantidade abaixo do mínimo.', parameters: semParams } },
      { type: 'function' as const, function: { name: 'cobrancas_em_aberto', description: 'Cobranças pendentes ou atrasadas.', parameters: paramObra } },
      { type: 'function' as const, function: { name: 'resumo_financeiro', description: 'Resumo financeiro geral.', parameters: semParams } },
    ];
  }
  return [
    { type: 'function' as const, function: { name: 'status_minha_obra', description: 'Status das obras em que o investidor participa.', parameters: paramObra } },
    { type: 'function' as const, function: { name: 'quanto_investi', description: 'Total investido e participação por obra.', parameters: semParams } },
    { type: 'function' as const, function: { name: 'minhas_cobrancas_pendentes', description: 'Cobranças pendentes do investidor.', parameters: semParams } },
    { type: 'function' as const, function: { name: 'quanto_lucrei', description: 'Lucros recebidos em obras vendidas.', parameters: semParams } },
  ];
}

export async function executeTool(name: string, args: any, user: AuthUser): Promise<any> {
  switch (name) {
    case 'status_obras': {
      const obras = await prisma.obra.findMany({ include: { etapas: true }, orderBy: { nome: 'asc' } });
      return obras.map((o: any) => {
        const orc = num(o.orcamentoPrevisto); const custo = num(o.custoTotal);
        return { obra: o.nome, status: STATUS_OBRA[o.status] ?? o.status, orcamento: formatBRL(orc), custoAcumulado: formatBRL(custo),
          percentualGasto: orc ? `${((custo / orc) * 100).toFixed(1)}%` : '—', ...resumoEtapas(o.etapas) };
      });
    }
    case 'gasto_mes': {
      let ref = new Date();
      if (args?.mes && /^\d{4}-\d{2}$/.test(args.mes)) ref = new Date(`${args.mes}-01T00:00:00Z`);
      const ini = inicioDoMes(ref); const fim = inicioDoProximoMes(ref);
      const grupos = await prisma.gasto.groupBy({ by: ['obraId'], where: { dataEmissao: { gte: ini, lt: fim } }, _sum: { valor: true }, _count: true });
      const obras = await prisma.obra.findMany({ where: { id: { in: grupos.map((g: any) => g.obraId) } }, select: { id: true, nome: true } });
      return { mes: `${String(ini.getUTCMonth() + 1).padStart(2, '0')}/${ini.getUTCFullYear()}`,
        total: formatBRL(grupos.reduce((s: number, g: any) => s + num(g._sum.valor), 0)),
        porObra: grupos.map((g: any) => ({ obra: obras.find((o: any) => o.id === g.obraId)?.nome, total: formatBRL(g._sum.valor), quantidade: g._count })) };
    }
    case 'estoque_baixo': {
      const itens = await prisma.estoqueItem.findMany({ where: { quantidadeMinima: { gt: 0 } }, include: { obra: { select: { nome: true } } } });
      const criticos = itens.filter((i: any) => num(i.quantidade) <= num(i.quantidadeMinima));
      return criticos.length ? criticos.map((i: any) => ({ item: i.item, obra: i.obra?.nome, quantidade: `${num(i.quantidade)} ${i.unidade}`, minimo: `${num(i.quantidadeMinima)} ${i.unidade}` }))
        : { mensagem: 'Nenhum item abaixo do mínimo' };
    }
    case 'cobrancas_em_aberto': {
      await prisma.cobranca.updateMany({ where: { status: 'PENDENTE', vencimento: { lt: inicioDoDia() } }, data: { status: 'ATRASADO' } });
      const lista = await prisma.cobranca.findMany({
        where: { status: { in: ['PENDENTE', 'ATRASADO'] }, obra: filtroNome(args?.obra) },
        include: { obra: { select: { nome: true } }, investidor: { select: { nome: true } }, gasto: { select: { fornecedor: true } } },
        orderBy: { vencimento: 'asc' }, take: 40,
      });
      return { quantidade: lista.length, total: formatBRL(lista.reduce((s: number, c: any) => s + num(c.valor), 0)),
        cobrancas: lista.map((c: any) => ({ investidor: c.investidor?.nome, obra: c.obra?.nome, referente: c.gasto?.fornecedor, valor: formatBRL(c.valor), vencimento: formatData(c.vencimento), status: STATUS_COB[c.status] })) };
    }
    case 'resumo_financeiro': {
      const [ap, ga, vendas] = await Promise.all([
        prisma.aporte.aggregate({ _sum: { valor: true } }),
        prisma.gasto.aggregate({ _sum: { valor: true } }),
        prisma.venda.aggregate({ _sum: { valorVenda: true, lucro: true, parteGestor: true, parteInvestidores: true } }),
      ]);
      return { capitalCaptado: formatBRL(ap._sum.valor), gastoTotal: formatBRL(ga._sum.valor), faturamento: formatBRL(vendas._sum.valorVenda),
        lucro: formatBRL(vendas._sum.lucro), parteGestor30: formatBRL(vendas._sum.parteGestor), parteInvestidores70: formatBRL(vendas._sum.parteInvestidores) };
    }
    case 'status_minha_obra': {
      const obras = await prisma.obra.findMany({ where: minhasObrasWhere(user, args?.obra), include: { etapas: true } });
      if (!obras.length) return { mensagem: 'Nenhuma obra encontrada entre as suas participações' };
      return obras.map((o: any) => ({ obra: o.nome, status: STATUS_OBRA[o.status] ?? o.status, ...resumoEtapas(o.etapas), previsaoEntrega: formatData(o.previsaoEntrega) }));
    }
    case 'quanto_investi': {
      const parts = await prisma.participacao.findMany({ where: { investidorId: user.id }, include: { obra: { select: { nome: true } } } });
      return { totalInvestido: formatBRL(parts.reduce((s: number, p: any) => s + num(p.totalAportado), 0)),
        porObra: parts.map((p: any) => ({ obra: p.obra?.nome, aportado: formatBRL(p.totalAportado), participacao: pct(num(p.percentual)) })) };
    }
    case 'minhas_cobrancas_pendentes': {
      await prisma.cobranca.updateMany({ where: { status: 'PENDENTE', vencimento: { lt: inicioDoDia() } }, data: { status: 'ATRASADO' } });
      const lista = await prisma.cobranca.findMany({
        where: { investidorId: user.id, status: { in: ['PENDENTE', 'ATRASADO'] } },
        include: { obra: { select: { nome: true } }, gasto: { select: { fornecedor: true } } },
        orderBy: { vencimento: 'asc' },
      });
      return { quantidade: lista.length, total: formatBRL(lista.reduce((s: number, c: any) => s + num(c.valor), 0)),
        cobrancas: lista.map((c: any) => ({ obra: c.obra?.nome, referente: c.gasto?.fornecedor, valor: formatBRL(c.valor), vencimento: formatData(c.vencimento), status: STATUS_COB[c.status] })) };
    }
    case 'quanto_lucrei': {
      const rateios = await prisma.rateioItem.findMany({ where: { investidorId: user.id }, include: { obra: { select: { nome: true } }, venda: true } });
      return { totalRecebido: formatBRL(rateios.reduce((s: number, r: any) => s + num(r.valor), 0)),
        porObra: rateios.map((r: any) => ({ obra: r.obra?.nome, valorRecebido: formatBRL(r.valor), participacao: pct(num(r.percentual)), dataVenda: formatData(r.venda?.dataVenda) })),
        ...(rateios.length ? {} : { mensagem: 'Nenhuma obra sua foi vendida ainda' }) };
    }
    default:
      return { erro: 'Função não disponível' };
  }
}

export function getAtalhos(role: string) {
  if (role === 'GESTOR') {
    return [
      { id: 'status_obras', rotulo: 'Status de todas as obras', pergunta: 'Qual o status de todas as obras?', funcao: 'status_obras' },
      { id: 'gasto_mes', rotulo: 'Gasto do mês', pergunta: 'Quanto foi gasto neste mês por obra?', funcao: 'gasto_mes' },
      { id: 'estoque_baixo', rotulo: 'Estoque baixo', pergunta: 'Quais itens estão com estoque baixo?', funcao: 'estoque_baixo' },
      { id: 'cobrancas_em_aberto', rotulo: 'Cobranças em aberto', pergunta: 'Quais cobranças estão em aberto?', funcao: 'cobrancas_em_aberto' },
    ];
  }
  return [
    { id: 'status_minha_obra', rotulo: 'Status da minha obra', pergunta: 'Qual o status da minha obra?', funcao: 'status_minha_obra' },
    { id: 'quanto_investi', rotulo: 'Quanto já investi', pergunta: 'Quanto eu já investi?', funcao: 'quanto_investi' },
    { id: 'minhas_cobrancas', rotulo: 'Minhas cobranças pendentes', pergunta: 'Quais são minhas cobranças pendentes?', funcao: 'minhas_cobrancas_pendentes' },
    { id: 'quanto_lucrei', rotulo: 'Quanto já lucrei', pergunta: 'Quanto eu já lucrei?', funcao: 'quanto_lucrei' },
  ];
}
