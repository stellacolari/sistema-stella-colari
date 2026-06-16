-- CreateTable
CREATE TABLE "ProdutoCicloEstoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "tamanhoAnel" TEXT NOT NULL DEFAULT 'UNICO',
    "origemTipo" TEXT,
    "origemId" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "quantidadeInicial" INTEGER NOT NULL DEFAULT 0,
    "quantidadeEntrada" INTEGER NOT NULL DEFAULT 0,
    "quantidadeVendida" INTEGER NOT NULL DEFAULT 0,
    "quantidadeAtual" INTEGER NOT NULL DEFAULT 0,
    "custoMedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoMedioVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaGerada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margemEstimada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellThrough" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasAtePrimeiraVenda" INTEGER,
    "diasAteEsgotar" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoCicloEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoMetricaSnapshot" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "tamanhoAnel" TEXT NOT NULL DEFAULT 'UNICO',
    "periodoTipo" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "vendasQuantidade" INTEGER NOT NULL DEFAULT 0,
    "receita" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margemEstimada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoqueInicial" INTEGER NOT NULL DEFAULT 0,
    "estoqueFinal" INTEGER NOT NULL DEFAULT 0,
    "entradas" INTEGER NOT NULL DEFAULT 0,
    "saidas" INTEGER NOT NULL DEFAULT 0,
    "sellThroughPeriodo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellThroughAcumulado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giroEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreValidacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusComercial" TEXT NOT NULL DEFAULT 'NAO_TESTADO',
    "recomendacao" TEXT,
    "dadosJson" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoMetricaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_produtoId_idx" ON "ProdutoCicloEstoque"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_variacaoId_idx" ON "ProdutoCicloEstoque"("variacaoId");

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_tamanhoAnel_idx" ON "ProdutoCicloEstoque"("tamanhoAnel");

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_status_idx" ON "ProdutoCicloEstoque"("status");

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_dataInicio_idx" ON "ProdutoCicloEstoque"("dataInicio");

-- CreateIndex
CREATE INDEX "ProdutoCicloEstoque_dataFim_idx" ON "ProdutoCicloEstoque"("dataFim");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_produtoId_idx" ON "ProdutoMetricaSnapshot"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_variacaoId_idx" ON "ProdutoMetricaSnapshot"("variacaoId");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_tamanhoAnel_idx" ON "ProdutoMetricaSnapshot"("tamanhoAnel");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_periodoTipo_idx" ON "ProdutoMetricaSnapshot"("periodoTipo");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_periodoInicio_idx" ON "ProdutoMetricaSnapshot"("periodoInicio");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_periodoFim_idx" ON "ProdutoMetricaSnapshot"("periodoFim");

-- CreateIndex
CREATE INDEX "ProdutoMetricaSnapshot_statusComercial_idx" ON "ProdutoMetricaSnapshot"("statusComercial");

-- AddForeignKey
ALTER TABLE "ProdutoCicloEstoque" ADD CONSTRAINT "ProdutoCicloEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCicloEstoque" ADD CONSTRAINT "ProdutoCicloEstoque_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoMetricaSnapshot" ADD CONSTRAINT "ProdutoMetricaSnapshot_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoMetricaSnapshot" ADD CONSTRAINT "ProdutoMetricaSnapshot_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
