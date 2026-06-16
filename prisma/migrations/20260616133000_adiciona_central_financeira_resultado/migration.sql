-- CreateTable
CREATE TABLE "ContaFinanceira" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataSaldoInicial" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVISTA',
    "dataPrevista" TIMESTAMP(3),
    "dataEfetiva" TIMESTAMP(3),
    "origemTipo" TEXT,
    "origemId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "pagoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraDistribuicaoResultado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "percentualEmpresa" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "percentualProLabore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraDistribuicaoResultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraDistribuicaoDestino" (
    "id" TEXT NOT NULL,
    "regraId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "RegraDistribuicaoDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApuracaoResultadoMensal" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "receitaRecebida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoProdutos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoEmbalagens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fretes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastosOperacionais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comprasEstoqueCaixa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultadoBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroApuravel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "caixaLiquido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regraSnapshotJson" JSONB,
    "fontesSnapshotJson" JSONB,
    "alertasSnapshotJson" JSONB,
    "fechadoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApuracaoResultadoMensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApuracaoResultadoDestino" (
    "id" TEXT NOT NULL,
    "apuracaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "statusPagamento" TEXT NOT NULL DEFAULT 'PREVISTO',
    "movimentacaoCaixaId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApuracaoResultadoDestino_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LancamentoFinanceiro"
ADD COLUMN "impactaCaixa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contaFinanceiraId" TEXT,
ADD COLUMN "movimentacaoCaixaId" TEXT;

-- CreateIndex
CREATE INDEX "ContaFinanceira_tipo_idx" ON "ContaFinanceira"("tipo");

-- CreateIndex
CREATE INDEX "ContaFinanceira_ativo_idx" ON "ContaFinanceira"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_codigo_key" ON "MovimentacaoCaixa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_origemTipo_origemId_key" ON "MovimentacaoCaixa"("origemTipo", "origemId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_contaId_idx" ON "MovimentacaoCaixa"("contaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_tipo_idx" ON "MovimentacaoCaixa"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_categoria_idx" ON "MovimentacaoCaixa"("categoria");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_status_idx" ON "MovimentacaoCaixa"("status");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_dataPrevista_idx" ON "MovimentacaoCaixa"("dataPrevista");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_dataEfetiva_idx" ON "MovimentacaoCaixa"("dataEfetiva");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_pagoEm_idx" ON "MovimentacaoCaixa"("pagoEm");

-- CreateIndex
CREATE INDEX "RegraDistribuicaoResultado_ativa_idx" ON "RegraDistribuicaoResultado"("ativa");

-- CreateIndex
CREATE INDEX "RegraDistribuicaoDestino_regraId_idx" ON "RegraDistribuicaoDestino"("regraId");

-- CreateIndex
CREATE INDEX "RegraDistribuicaoDestino_tipo_idx" ON "RegraDistribuicaoDestino"("tipo");

-- CreateIndex
CREATE INDEX "RegraDistribuicaoDestino_ativo_idx" ON "RegraDistribuicaoDestino"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ApuracaoResultadoMensal_codigo_key" ON "ApuracaoResultadoMensal"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ApuracaoResultadoMensal_mes_ano_key" ON "ApuracaoResultadoMensal"("mes", "ano");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoMensal_status_idx" ON "ApuracaoResultadoMensal"("status");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoMensal_periodoInicio_idx" ON "ApuracaoResultadoMensal"("periodoInicio");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoMensal_periodoFim_idx" ON "ApuracaoResultadoMensal"("periodoFim");

-- CreateIndex
CREATE UNIQUE INDEX "ApuracaoResultadoDestino_movimentacaoCaixaId_key" ON "ApuracaoResultadoDestino"("movimentacaoCaixaId");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoDestino_apuracaoId_idx" ON "ApuracaoResultadoDestino"("apuracaoId");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoDestino_tipo_idx" ON "ApuracaoResultadoDestino"("tipo");

-- CreateIndex
CREATE INDEX "ApuracaoResultadoDestino_statusPagamento_idx" ON "ApuracaoResultadoDestino"("statusPagamento");

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoFinanceiro_movimentacaoCaixaId_key" ON "LancamentoFinanceiro"("movimentacaoCaixaId");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_impactaCaixa_idx" ON "LancamentoFinanceiro"("impactaCaixa");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_contaFinanceiraId_idx" ON "LancamentoFinanceiro"("contaFinanceiraId");

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_contaFinanceiraId_fkey" FOREIGN KEY ("contaFinanceiraId") REFERENCES "ContaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_movimentacaoCaixaId_fkey" FOREIGN KEY ("movimentacaoCaixaId") REFERENCES "MovimentacaoCaixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaFinanceira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraDistribuicaoDestino" ADD CONSTRAINT "RegraDistribuicaoDestino_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraDistribuicaoResultado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApuracaoResultadoDestino" ADD CONSTRAINT "ApuracaoResultadoDestino_apuracaoId_fkey" FOREIGN KEY ("apuracaoId") REFERENCES "ApuracaoResultadoMensal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApuracaoResultadoDestino" ADD CONSTRAINT "ApuracaoResultadoDestino_movimentacaoCaixaId_fkey" FOREIGN KEY ("movimentacaoCaixaId") REFERENCES "MovimentacaoCaixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
