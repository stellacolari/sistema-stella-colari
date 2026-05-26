-- CreateTable
CREATE TABLE "ProdutoCanal" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "skuExterno" TEXT,
    "produtoExternoId" TEXT,
    "variacaoExternaId" TEXT,
    "tituloExterno" TEXT,
    "precoCanal" DOUBLE PRECISION,
    "estoqueAnunciado" INTEGER,
    "sincronizarEstoque" BOOLEAN NOT NULL DEFAULT true,
    "sincronizarPreco" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaSincronizacaoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoCanal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoCanal_produtoId_idx" ON "ProdutoCanal"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoCanal_canal_idx" ON "ProdutoCanal"("canal");

-- CreateIndex
CREATE INDEX "ProdutoCanal_skuExterno_idx" ON "ProdutoCanal"("skuExterno");

-- CreateIndex
CREATE INDEX "ProdutoCanal_produtoExternoId_idx" ON "ProdutoCanal"("produtoExternoId");

-- CreateIndex
CREATE INDEX "ProdutoCanal_variacaoExternaId_idx" ON "ProdutoCanal"("variacaoExternaId");

-- CreateIndex
CREATE INDEX "ProdutoCanal_ativo_idx" ON "ProdutoCanal"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoCanal_canal_skuExterno_key" ON "ProdutoCanal"("canal", "skuExterno");

-- AddForeignKey
ALTER TABLE "ProdutoCanal" ADD CONSTRAINT "ProdutoCanal_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
