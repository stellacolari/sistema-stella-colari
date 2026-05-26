-- CreateTable
CREATE TABLE "public"."Produto" (
    "id" TEXT NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "codigoFornecedor" TEXT,
    "nome" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "linkCompra" TEXT,
    "custoBase" DECIMAL(10,2) NOT NULL,
    "margemAplicada" DECIMAL(10,2) NOT NULL,
    "precoVenda" DECIMAL(10,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "fornecedorPadrao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigoInterno_key" ON "public"."Produto"("codigoInterno");
