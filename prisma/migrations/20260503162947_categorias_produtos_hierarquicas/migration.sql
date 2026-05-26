-- CreateTable
CREATE TABLE "CategoriaProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "categoriaMaeId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoCategoria" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaProduto_slug_key" ON "CategoriaProduto"("slug");

-- CreateIndex
CREATE INDEX "CategoriaProduto_categoriaMaeId_idx" ON "CategoriaProduto"("categoriaMaeId");

-- CreateIndex
CREATE INDEX "CategoriaProduto_slug_idx" ON "CategoriaProduto"("slug");

-- CreateIndex
CREATE INDEX "CategoriaProduto_ativo_idx" ON "CategoriaProduto"("ativo");

-- CreateIndex
CREATE INDEX "CategoriaProduto_ordem_idx" ON "CategoriaProduto"("ordem");

-- CreateIndex
CREATE INDEX "ProdutoCategoria_produtoId_idx" ON "ProdutoCategoria"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoCategoria_categoriaId_idx" ON "ProdutoCategoria"("categoriaId");

-- CreateIndex
CREATE INDEX "ProdutoCategoria_principal_idx" ON "ProdutoCategoria"("principal");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoCategoria_produtoId_categoriaId_key" ON "ProdutoCategoria"("produtoId", "categoriaId");

-- AddForeignKey
ALTER TABLE "CategoriaProduto" ADD CONSTRAINT "CategoriaProduto_categoriaMaeId_fkey" FOREIGN KEY ("categoriaMaeId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCategoria" ADD CONSTRAINT "ProdutoCategoria_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoCategoria" ADD CONSTRAINT "ProdutoCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
