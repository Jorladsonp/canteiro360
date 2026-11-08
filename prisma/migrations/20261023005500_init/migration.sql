-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GESTOR', 'INVESTIDOR');

-- CreateEnum
CREATE TYPE "ObraStatus" AS ENUM ('PLANEJAMENTO', 'EM_EXECUCAO', 'CONCLUIDA', 'VENDIDA');

-- CreateEnum
CREATE TYPE "CobrancaStatus" AS ENUM ('PENDENTE', 'PAGO_AGUARDANDO_CONFIRMACAO', 'PAGO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "GastoCategoria" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'SERVICO', 'EQUIPAMENTO', 'TAXAS_LICENCAS', 'PROJETO', 'OUTROS');

-- CreateEnum
CREATE TYPE "GastoOrigem" AS ENUM ('NOTA_FISCAL', 'BOLETO', 'MAO_DE_OBRA', 'MANUAL');

-- CreateEnum
CREATE TYPE "AiUsageTipo" AS ENUM ('CHAT', 'OCR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "firstLogin" BOOLEAN NOT NULL DEFAULT false,
    "onboardingConcluido" BOOLEAN NOT NULL DEFAULT false,
    "refreshTokenHash" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "descricao" TEXT,
    "orcamentoPrevisto" DECIMAL(14,2) NOT NULL,
    "valorVendaEstimado" DECIMAL(14,2),
    "custoTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ObraStatus" NOT NULL DEFAULT 'PLANEJAMENTO',
    "dataInicio" TIMESTAMP(3),
    "previsaoEntrega" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_obra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "legenda" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "percentualProgresso" INTEGER NOT NULL DEFAULT 0,
    "dataConclusao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aportes" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "investidorId" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacoes" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "investidorId" TEXT NOT NULL,
    "totalAportado" DECIMAL(14,2) NOT NULL,
    "percentual" DECIMAL(9,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "vencimento" TIMESTAMP(3),
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoria" "GastoCategoria" NOT NULL DEFAULT 'OUTROS',
    "origem" "GastoOrigem" NOT NULL DEFAULT 'MANUAL',
    "comprovanteArquivo" TEXT,
    "comprovanteMime" TEXT,
    "comprovantePublic" BOOLEAN NOT NULL DEFAULT false,
    "dadosOcr" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto_itens" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "unidade" TEXT,
    "precoUnitario" DECIMAL(14,2),

    CONSTRAINT "gasto_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "investidorId" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "percentualAplicado" DECIMAL(9,6) NOT NULL,
    "vencimento" TIMESTAMP(3),
    "status" "CobrancaStatus" NOT NULL DEFAULT 'PENDENTE',
    "pagoInformadoEm" TIMESTAMP(3),
    "confirmadoEm" TIMESTAMP(3),
    "confirmadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_itens" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "quantidade" DECIMAL(14,3) NOT NULL,
    "quantidadeMinima" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "precoUnitario" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "obraAtualId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_equipe" (
    "id" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "custoHora" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalas" (
    "id" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "obraId" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "tarefa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "valorVenda" DECIMAL(14,2) NOT NULL,
    "custoTotal" DECIMAL(14,2) NOT NULL,
    "lucro" DECIMAL(14,2) NOT NULL,
    "parteGestor" DECIMAL(14,2) NOT NULL,
    "parteInvestidores" DECIMAL(14,2) NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateio_itens" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "investidorId" TEXT NOT NULL,
    "percentual" DECIMAL(9,6) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rateio_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "valorAnterior" JSONB,
    "valorNovo" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tipo" "AiUsageTipo" NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "fotos_obra_obraId_createdAt_idx" ON "fotos_obra"("obraId", "createdAt");

-- CreateIndex
CREATE INDEX "etapas_obraId_idx" ON "etapas"("obraId");

-- CreateIndex
CREATE INDEX "aportes_obraId_idx" ON "aportes"("obraId");

-- CreateIndex
CREATE INDEX "aportes_investidorId_idx" ON "aportes"("investidorId");

-- CreateIndex
CREATE UNIQUE INDEX "participacoes_obraId_investidorId_key" ON "participacoes"("obraId", "investidorId");

-- CreateIndex
CREATE INDEX "gastos_obraId_dataEmissao_idx" ON "gastos"("obraId", "dataEmissao");

-- CreateIndex
CREATE INDEX "cobrancas_investidorId_status_idx" ON "cobrancas"("investidorId", "status");

-- CreateIndex
CREATE INDEX "cobrancas_obraId_status_idx" ON "cobrancas"("obraId", "status");

-- CreateIndex
CREATE INDEX "estoque_itens_obraId_idx" ON "estoque_itens"("obraId");

-- CreateIndex
CREATE INDEX "escalas_dataInicio_idx" ON "escalas"("dataInicio");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_obraId_key" ON "vendas"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "rateio_itens_vendaId_investidorId_key" ON "rateio_itens"("vendaId", "investidorId");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_createdAt_idx" ON "ai_usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "fotos_obra" ADD CONSTRAINT "fotos_obra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aportes" ADD CONSTRAINT "aportes_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aportes" ADD CONSTRAINT "aportes_investidorId_fkey" FOREIGN KEY ("investidorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_investidorId_fkey" FOREIGN KEY ("investidorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_itens" ADD CONSTRAINT "gasto_itens_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "gastos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "gastos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_investidorId_fkey" FOREIGN KEY ("investidorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_itens" ADD CONSTRAINT "estoque_itens_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_obraAtualId_fkey" FOREIGN KEY ("obraAtualId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_equipe" ADD CONSTRAINT "membros_equipe_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateio_itens" ADD CONSTRAINT "rateio_itens_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateio_itens" ADD CONSTRAINT "rateio_itens_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateio_itens" ADD CONSTRAINT "rateio_itens_investidorId_fkey" FOREIGN KEY ("investidorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
