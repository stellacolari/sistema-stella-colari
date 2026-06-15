-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "fornecedorParceiro" TEXT,
    "valorPrevisto" DOUBLE PRECISION,
    "valorReal" DOUBLE PRECISION NOT NULL,
    "statusPagamento" TEXT NOT NULL DEFAULT 'PENDENTE',
    "statusOperacional" TEXT NOT NULL DEFAULT 'ATIVO',
    "dataCompetencia" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "recorrencia" TEXT,
    "quantidadeParcelas" INTEGER,
    "parcelaAtual" INTEGER,
    "meioPagamento" TEXT,
    "origemTipo" TEXT,
    "origemId" TEXT,
    "observacoes" TEXT,
    "linkReferencia" TEXT,
    "anexoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "statusAntesLixeira" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoFinanceiro_codigo_key" ON "LancamentoFinanceiro"("codigo");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tipo_idx" ON "LancamentoFinanceiro"("tipo");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_categoria_idx" ON "LancamentoFinanceiro"("categoria");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_statusPagamento_idx" ON "LancamentoFinanceiro"("statusPagamento");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_statusOperacional_idx" ON "LancamentoFinanceiro"("statusOperacional");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_status_idx" ON "LancamentoFinanceiro"("status");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_dataCompetencia_idx" ON "LancamentoFinanceiro"("dataCompetencia");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_dataVencimento_idx" ON "LancamentoFinanceiro"("dataVencimento");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_dataPagamento_idx" ON "LancamentoFinanceiro"("dataPagamento");
