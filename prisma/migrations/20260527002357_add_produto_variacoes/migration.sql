-- CreateTable
CREATE TABLE "ProdutoVariacao" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoVariacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoVariacaoOpcao" (
    "id" TEXT NOT NULL,
    "variacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "precoAdicional" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoAdicional" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoVariacaoOpcao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoVariacao_produtoId_idx" ON "ProdutoVariacao"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoVariacao_ativo_idx" ON "ProdutoVariacao"("ativo");

-- CreateIndex
CREATE INDEX "ProdutoVariacao_ordem_idx" ON "ProdutoVariacao"("ordem");

-- CreateIndex
CREATE INDEX "ProdutoVariacaoOpcao_variacaoId_idx" ON "ProdutoVariacaoOpcao"("variacaoId");

-- CreateIndex
CREATE INDEX "ProdutoVariacaoOpcao_ativo_idx" ON "ProdutoVariacaoOpcao"("ativo");

-- CreateIndex
CREATE INDEX "ProdutoVariacaoOpcao_ordem_idx" ON "ProdutoVariacaoOpcao"("ordem");

-- AddForeignKey
ALTER TABLE "ProdutoVariacao" ADD CONSTRAINT "ProdutoVariacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoVariacaoOpcao" ADD CONSTRAINT "ProdutoVariacaoOpcao_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
