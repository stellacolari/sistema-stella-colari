-- CreateTable
CREATE TABLE "EstoqueProduto" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidadeAtual" INTEGER NOT NULL DEFAULT 0,
    "valorAcumulado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoMedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstoqueAdicional" (
    "id" TEXT NOT NULL,
    "itemAdicionalId" TEXT NOT NULL,
    "quantidadeAtual" INTEGER NOT NULL DEFAULT 0,
    "valorAcumulado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoMedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "codigoMovimentacao" TEXT NOT NULL,
    "tipoMovimentacao" TEXT NOT NULL,
    "origemTipo" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "itemTipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "faturamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentoCliente" TEXT,
    "status" TEXT NOT NULL,
    "relacionadoA" TEXT,
    "gastoProdutoPrincipal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastoAdd1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastoAdd2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastoAdd3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueProduto_produtoId_key" ON "EstoqueProduto"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueAdicional_itemAdicionalId_key" ON "EstoqueAdicional"("itemAdicionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Movimentacao_codigoMovimentacao_key" ON "Movimentacao"("codigoMovimentacao");

-- AddForeignKey
ALTER TABLE "EstoqueProduto" ADD CONSTRAINT "EstoqueProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueAdicional" ADD CONSTRAINT "EstoqueAdicional_itemAdicionalId_fkey" FOREIGN KEY ("itemAdicionalId") REFERENCES "ItemAdicional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
