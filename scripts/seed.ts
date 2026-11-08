/* eslint-disable no-console */
import { PrismaClient, CobrancaStatus, GastoCategoria, GastoOrigem, ObraStatus, Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { distribuirCentavos, num, toCents } from '../lib/money';
import { recalcularParticipacoes } from '../lib/participacao.util';
import { calcularRateio } from '../lib/rateio.calc';

const prisma = new PrismaClient();
const DIA = 24 * 60 * 60 * 1000;
const hoje = new Date();
const dataRel = (dias: number) => {
  const d = new Date(hoje.getTime() + dias * DIA);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
};

async function aporte(obraId: string, investidorId: string, valor: number, dias: number, gestorId: string, obs?: string) {
  await prisma.$transaction(async (tx: any) => {
    const a = await tx.aporte.create({ data: { obraId, investidorId, valor, data: dataRel(dias), observacao: obs, createdById: gestorId, createdAt: dataRel(dias) } });
    const parts = await recalcularParticipacoes(tx, obraId);
    await tx.auditLog.create({
      data: { userId: gestorId, acao: 'REGISTRAR_APORTE', entidade: 'Obra', entidadeId: obraId, createdAt: dataRel(dias),
        valorNovo: { aporte: { id: a.id, investidorId, valor }, participacoes: parts } as Prisma.InputJsonValue },
    });
  });
}

interface GastoSeed {
  fornecedor: string; descricao: string; valor: number; categoria: GastoCategoria; origem?: GastoOrigem;
  emissao: number; vencimento: number;
  status: CobrancaStatus | CobrancaStatus[];
  itens?: { descricao: string; quantidade: number; unidade: string; precoUnitario: number }[];
}

async function gastoSeed(obraId: string, g: GastoSeed, gestorId: string) {
  await prisma.$transaction(async (tx: any) => {
    const criado = await tx.gasto.create({
      data: {
        obraId, fornecedor: g.fornecedor, descricao: g.descricao, valor: g.valor, categoria: g.categoria,
        origem: g.origem ?? GastoOrigem.NOTA_FISCAL, dataEmissao: dataRel(g.emissao), vencimento: dataRel(g.vencimento),
        createdById: gestorId, createdAt: dataRel(g.emissao),
        itens: g.itens ? { create: g.itens } : undefined,
      },
    });
    await tx.obra.update({ where: { id: obraId }, data: { custoTotal: { increment: g.valor } } });
    const parts = await tx.participacao.findMany({ where: { obraId }, orderBy: { investidorId: 'asc' } });
    const valores = distribuirCentavos(toCents(g.valor), parts.map((p: any) => num(p.percentual)));
    for (let i = 0; i < parts.length; i++) {
      const status = Array.isArray(g.status) ? g.status[i] ?? g.status[0] : g.status;
      const pago = status === CobrancaStatus.PAGO;
      await tx.cobranca.create({
        data: {
          gastoId: criado.id, obraId, investidorId: parts[i].investidorId, valor: valores[i] / 100,
          percentualAplicado: parts[i].percentual, vencimento: dataRel(g.vencimento), status,
          pagoInformadoEm: pago || status === CobrancaStatus.PAGO_AGUARDANDO_CONFIRMACAO ? dataRel(Math.min(g.vencimento, -1)) : null,
          confirmadoEm: pago ? dataRel(Math.min(g.vencimento, -1)) : null, confirmadoPorId: pago ? gestorId : null,
          createdAt: dataRel(g.emissao),
        },
      });
    }
    await tx.auditLog.create({
      data: { userId: gestorId, acao: 'REGISTRAR_GASTO', entidade: 'Gasto', entidadeId: criado.id, createdAt: dataRel(g.emissao),
        valorNovo: { valor: g.valor, fornecedor: g.fornecedor } },
    });
  });
}

async function main() {
  console.log('\u{1F9F9} Verificando se seed j\u00e1 foi executado...');
  const existeGestor = await prisma.user.findUnique({ where: { email: 'gestor@canteiro.com' } });
  if (existeGestor) {
    console.log('\u2705 Seed j\u00e1 foi executado anteriormente. Pulando para evitar duplicatas.');
    return;
  }

  console.log('\u{1F464} Criando usu\u00e1rios...');
  const gestor = await prisma.user.create({
    data: { nome: 'Carlos Mendes', email: 'gestor@canteiro.com', telefone: '(11) 98888-1000', role: Role.GESTOR, senhaHash: await bcrypt.hash('Gestor@123', 10) },
  });
  const senhaInv = await bcrypt.hash('Invest@123', 10);
  const nomes = ['Ana Souza', 'Bruno Lima', 'Carla Ferreira', 'Diego Rocha'];
  const inv = [];
  for (let i = 0; i < 4; i++) {
    inv.push(await prisma.user.create({
      data: { nome: nomes[i], email: `investidor${i + 1}@canteiro.com`, telefone: `(11) 97777-10${i + 1}0`, role: Role.INVESTIDOR, senhaHash: senhaInv },
    }));
  }
  const [ana, bruno, carla, diego] = inv;

  // Hidden test account
  await prisma.user.upsert({
    where: { email: process.env.TEST_ACCOUNT_EMAIL ?? 'test@test.com' },
    create: { nome: 'Test Admin', email: process.env.TEST_ACCOUNT_EMAIL ?? 'test@test.com', role: Role.GESTOR, senhaHash: await bcrypt.hash(process.env.TEST_ACCOUNT_PASSWORD ?? 'test123', 10) },
    update: {},
  });

  // ---- Obra 1: Edif\u00edcio Aurora ----
  console.log('\u{1F3D7}\u{FE0F}  Edif\u00edcio Aurora...');
  const aurora = await prisma.obra.create({
    data: {
      nome: 'Edif\u00edcio Aurora', endereco: 'Rua das Palmeiras, 450 \u2014 Vila Mariana, S\u00e3o Paulo/SP',
      descricao: 'Edif\u00edcio residencial de 8 pavimentos com 16 apartamentos de 2 e 3 dormit\u00f3rios.',
      orcamentoPrevisto: 2_400_000, valorVendaEstimado: 3_300_000, status: ObraStatus.EM_EXECUCAO,
      dataInicio: dataRel(-200), previsaoEntrega: dataRel(310),
      etapas: {
        create: [
          { nome: 'Funda\u00e7\u00e3o', ordem: 0, percentualProgresso: 100, dataConclusao: dataRel(-150) },
          { nome: 'Estrutura', ordem: 1, percentualProgresso: 100, dataConclusao: dataRel(-60) },
          { nome: 'Alvenaria', ordem: 2, percentualProgresso: 65 },
          { nome: 'Instala\u00e7\u00f5es el\u00e9tricas e hidr\u00e1ulicas', ordem: 3, percentualProgresso: 20 },
          { nome: 'Acabamento', ordem: 4, percentualProgresso: 0 },
        ],
      },
    },
  });
  await aporte(aurora.id, ana.id, 600_000, -210, gestor.id, 'Aporte inicial');
  await aporte(aurora.id, bruno.id, 500_000, -205, gestor.id, 'Aporte inicial');
  await aporte(aurora.id, carla.id, 300_000, -200, gestor.id, 'Aporte inicial');
  await aporte(aurora.id, ana.id, 200_000, -120, gestor.id, 'Aporte complementar');

  const P = CobrancaStatus.PAGO;
  const gastosAurora: GastoSeed[] = [
    { fornecedor: 'Concreteira Forte Ltda.', descricao: 'Concreto usinado fck 30 MPa \u2014 funda\u00e7\u00e3o e lajes', valor: 185_000, categoria: GastoCategoria.MATERIAL, emissao: -170, vencimento: -160, status: P,
      itens: [{ descricao: 'Concreto usinado fck 30', quantidade: 420, unidade: 'm\u00b3', precoUnitario: 440.48 }] },
    { fornecedor: 'A\u00e7o Brasil Distribuidora', descricao: 'Verga\u00e7\u00f5es CA-50 diversas bitolas', valor: 142_300, categoria: GastoCategoria.MATERIAL, emissao: -140, vencimento: -130, status: P,
      itens: [{ descricao: 'Vergalh\u00e3o CA-50 10mm', quantidade: 1800, unidade: 'barra', precoUnitario: 52.4 }, { descricao: 'Vergalh\u00e3o CA-50 12,5mm', quantidade: 700, unidade: 'barra', precoUnitario: 68.5 }] },
    { fornecedor: 'Locadora Andaimes Sul', descricao: 'Loca\u00e7\u00e3o de andaimes e escoras (3 meses)', valor: 18_600, categoria: GastoCategoria.EQUIPAMENTO, origem: GastoOrigem.BOLETO, emissao: -110, vencimento: -100, status: P },
    { fornecedor: 'Equipe Estrutura', descricao: 'M\u00e3o de obra \u2014 estrutura (480h)', valor: 64_800, categoria: GastoCategoria.MAO_DE_OBRA, origem: GastoOrigem.MAO_DE_OBRA, emissao: -80, vencimento: -73, status: P },
    { fornecedor: 'Cer\u00e2mica Bom Barro', descricao: 'Blocos cer\u00e2micos 14x19x29', valor: 52_750, categoria: GastoCategoria.MATERIAL, emissao: -45, vencimento: -35, status: P,
      itens: [{ descricao: 'Bloco cer\u00e2mico 14x19x29', quantidade: 25000, unidade: 'un', precoUnitario: 2.11 }] },
    { fornecedor: 'Prefeitura de S\u00e3o Paulo', descricao: 'Taxa de alvar\u00e1 de execu\u00e7\u00e3o \u2014 renova\u00e7\u00e3o', valor: 8_420, categoria: GastoCategoria.TAXAS_LICENCAS, origem: GastoOrigem.BOLETO, emissao: -25, vencimento: -5,
      status: [CobrancaStatus.PAGO_AGUARDANDO_CONFIRMACAO, CobrancaStatus.ATRASADO, CobrancaStatus.ATRASADO] },
    { fornecedor: 'El\u00e9trica Luz & Cia', descricao: 'Fios, cabos e eletrodutos', valor: 27_380, categoria: GastoCategoria.MATERIAL, emissao: -10, vencimento: 8, status: CobrancaStatus.PENDENTE,
      itens: [{ descricao: 'Cabo flex\u00edvel 2,5mm (rolo 100m)', quantidade: 120, unidade: 'rolo', precoUnitario: 189.9 }, { descricao: 'Eletroduto corrugado 3/4"', quantidade: 90, unidade: 'rolo', precoUnitario: 51.0 }] },
    { fornecedor: 'Hidr\u00e1ulica Fluxo', descricao: 'Tubos e conex\u00f5es PVC/PPR', valor: 19_940, categoria: GastoCategoria.MATERIAL, emissao: -3, vencimento: 12, status: CobrancaStatus.PENDENTE },
  ];
  for (const g of gastosAurora) await gastoSeed(aurora.id, g, gestor.id);

  await prisma.estoqueItem.createMany({
    data: [
      { obraId: aurora.id, item: 'Cimento CP-II 50kg', unidade: 'saco', quantidade: 18, quantidadeMinima: 40, precoUnitario: 38.9 },
      { obraId: aurora.id, item: 'Vergalh\u00e3o CA-50 10mm', unidade: 'barra', quantidade: 120, quantidadeMinima: 50, precoUnitario: 52.4 },
      { obraId: aurora.id, item: 'Bloco cer\u00e2mico 14x19x29', unidade: 'un', quantidade: 2600, quantidadeMinima: 1000, precoUnitario: 2.11 },
      { obraId: aurora.id, item: 'Areia m\u00e9dia', unidade: 'm\u00b3', quantidade: 6, quantidadeMinima: 10, precoUnitario: 145 },
      { obraId: aurora.id, item: 'Cabo flex\u00edvel 2,5mm (rolo 100m)', unidade: 'rolo', quantidade: 95, quantidadeMinima: 20, precoUnitario: 189.9 },
    ],
  });

  // ---- Obra 2: Residencial Brisa ----
  console.log('\u{1F3E1} Residencial Brisa...');
  const brisa = await prisma.obra.create({
    data: {
      nome: 'Residencial Brisa', endereco: 'Av. Atl\u00e2ntica, 1200 \u2014 Jardim Praia, Santos/SP',
      descricao: 'Condom\u00ednio de 6 sobrados geminados.', orcamentoPrevisto: 1_200_000, valorVendaEstimado: 1_650_000,
      status: ObraStatus.PLANEJAMENTO, dataInicio: dataRel(45), previsaoEntrega: dataRel(420),
      etapas: {
        create: [
          { nome: 'Projeto e aprova\u00e7\u00f5es', ordem: 0, percentualProgresso: 70 },
          { nome: 'Terraplanagem', ordem: 1, percentualProgresso: 0 },
          { nome: 'Funda\u00e7\u00e3o', ordem: 2, percentualProgresso: 0 },
          { nome: 'Estrutura e alvenaria', ordem: 3, percentualProgresso: 0 },
        ],
      },
    },
  });
  await aporte(brisa.id, bruno.id, 250_000, -40, gestor.id, 'Aporte inicial');
  await aporte(brisa.id, diego.id, 150_000, -35, gestor.id, 'Aporte inicial');
  await gastoSeed(brisa.id, { fornecedor: 'Studio Arq Projetos', descricao: 'Projeto arquitet\u00f4nico e executivo', valor: 38_000, categoria: GastoCategoria.PROJETO, emissao: -6, vencimento: 15, status: CobrancaStatus.PENDENTE }, gestor.id);
  await gastoSeed(brisa.id, { fornecedor: 'CETESB', descricao: 'Taxas de licenciamento ambiental', valor: 12_500, categoria: GastoCategoria.TAXAS_LICENCAS, origem: GastoOrigem.BOLETO, emissao: -2, vencimento: 20, status: CobrancaStatus.PENDENTE }, gestor.id);

  // ---- Obra 3: Casa Ver\u00e3o ----
  console.log('\u{1F3D6}\u{FE0F}  Casa Ver\u00e3o...');
  const casa = await prisma.obra.create({
    data: {
      nome: 'Casa Ver\u00e3o', endereco: 'Rua dos Coqueiros, 88 \u2014 Riviera, Bertioga/SP', descricao: 'Casa de praia de alto padr\u00e3o, 4 su\u00edtes.',
      orcamentoPrevisto: 360_000, valorVendaEstimado: 480_000, status: ObraStatus.CONCLUIDA,
      dataInicio: dataRel(-420), previsaoEntrega: dataRel(-60),
      etapas: {
        create: [
          { nome: 'Funda\u00e7\u00e3o', ordem: 0, percentualProgresso: 100, dataConclusao: dataRel(-380) },
          { nome: 'Estrutura', ordem: 1, percentualProgresso: 100, dataConclusao: dataRel(-300) },
          { nome: 'Acabamento', ordem: 2, percentualProgresso: 100, dataConclusao: dataRel(-75) },
        ],
      },
    },
  });
  await aporte(casa.id, carla.id, 210_000, -430, gestor.id, 'Aporte inicial');
  await aporte(casa.id, diego.id, 140_000, -428, gestor.id, 'Aporte inicial');
  const gastosCasa: [string, string, number, GastoCategoria, number][] = [
    ['Terraplenagem Litoral', 'Terraplanagem e preparo do terreno', 28_000, GastoCategoria.SERVICO, -410],
    ['Dep\u00f3sito Central de Materiais', 'Materiais para estrutura', 96_500, GastoCategoria.MATERIAL, -360],
    ['Equipe Estrutura', 'M\u00e3o de obra completa', 118_000, GastoCategoria.MAO_DE_OBRA, -250],
    ['Acabamentos Prime', 'Pisos, revestimentos e lou\u00e7as', 74_300, GastoCategoria.MATERIAL, -150],
    ['Esquadrias Mar Azul', 'Esquadrias de alum\u00ednio e vidros', 33_200, GastoCategoria.MATERIAL, -110],
  ];
  for (const [fornecedor, descricao, valor, categoria, emissao] of gastosCasa) {
    await gastoSeed(casa.id, { fornecedor, descricao, valor, categoria, emissao, vencimento: emissao + 10, status: P }, gestor.id);
  }

  // Venda: R$ 500.000 \u2212 custo R$ 350.000 = lucro R$ 150.000
  const casaAtual = await prisma.obra.findUniqueOrThrow({ where: { id: casa.id }, include: { participacoes: { orderBy: { investidorId: 'asc' } } } });
  const r = calcularRateio(500_000, num(casaAtual.custoTotal), casaAtual.participacoes.map((p: any) => ({ investidorId: p.investidorId, percentual: num(p.percentual) })));
  await prisma.$transaction(async (tx: any) => {
    const venda = await tx.venda.create({
      data: {
        obraId: casa.id, valorVenda: r.valorVenda, custoTotal: r.custoTotal, lucro: r.lucro, parteGestor: r.parteGestor,
        parteInvestidores: r.parteInvestidores, dataVenda: dataRel(-30), createdById: gestor.id,
        rateios: { create: r.itens.map((i: any) => ({ obraId: casa.id, investidorId: i.investidorId, percentual: i.percentual, valor: i.valor })) },
      },
    });
    await tx.obra.update({ where: { id: casa.id }, data: { status: ObraStatus.VENDIDA } });
    await tx.auditLog.create({
      data: { userId: gestor.id, acao: 'VENDA_E_RATEIO', entidade: 'Obra', entidadeId: casa.id, createdAt: dataRel(-30),
        valorAnterior: { status: 'CONCLUIDA' }, valorNovo: { status: 'VENDIDA', vendaId: venda.id, ...r } as Prisma.InputJsonValue },
    });
  });

  // ---- Equipes e escalas ----
  console.log('\u{1F477} Equipes e escalas...');
  const eqEstrutura = await prisma.equipe.create({
    data: {
      nome: 'Equipe Estrutura', obraAtualId: aurora.id,
      membros: { create: [
        { nome: 'Jos\u00e9 Pereira', cargo: 'Mestre de obras', custoHora: 45 },
        { nome: 'Marcos Silva', cargo: 'Pedreiro', custoHora: 28 },
        { nome: 'Rafael Costa', cargo: 'Pedreiro', custoHora: 28 },
        { nome: 'Lucas Alves', cargo: 'Servente', custoHora: 18 },
      ] },
    },
  });
  const eqInstal = await prisma.equipe.create({
    data: {
      nome: 'Equipe Instala\u00e7\u00f5es', obraAtualId: aurora.id,
      membros: { create: [
        { nome: 'Paulo Henrique', cargo: 'Eletricista', custoHora: 38 },
        { nome: 'Andr\u00e9 Santos', cargo: 'Encanador', custoHora: 36 },
      ] },
    },
  });
  await prisma.escala.createMany({
    data: [
      { equipeId: eqEstrutura.id, obraId: aurora.id, dataInicio: dataRel(1), dataFim: dataRel(5), tarefa: 'Alvenaria do 6\u00ba e 7\u00ba pavimentos' },
      { equipeId: eqInstal.id, obraId: aurora.id, dataInicio: dataRel(2), dataFim: dataRel(6), tarefa: 'Passagem de eletrodutos \u2014 3\u00ba ao 5\u00ba pavimento' },
      { equipeId: eqEstrutura.id, obraId: brisa.id, dataInicio: dataRel(9), dataFim: dataRel(12), tarefa: 'Visita t\u00e9cnica e marca\u00e7\u00e3o do terreno' },
      { equipeId: eqInstal.id, obraId: aurora.id, dataInicio: dataRel(-6), dataFim: dataRel(-2), tarefa: 'Prumadas hidr\u00e1ulicas' },
    ],
  });

  const totalCob = await prisma.cobranca.count({ where: { status: { in: [CobrancaStatus.PENDENTE, CobrancaStatus.ATRASADO] } } });
  console.log(`\n\u2705 Seed conclu\u00eddo!`);
  console.log(`   Casa Ver\u00e3o: venda R$ ${r.valorVenda} | custo R$ ${r.custoTotal} | lucro R$ ${r.lucro} | gestor R$ ${r.parteGestor} | investidores R$ ${r.parteInvestidores}`);
  console.log(`   Cobran\u00e7as em aberto: ${totalCob}`);
  console.log('\n   Gestor:       gestor@canteiro.com / Gestor@123');
  console.log('   Investidores: investidor1..4@canteiro.com / Invest@123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
