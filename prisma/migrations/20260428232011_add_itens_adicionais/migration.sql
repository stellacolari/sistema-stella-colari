/*
  Warnings:

  - You are about to alter the column `custoBase` on the `Produto` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `margemAplicada` on the `Produto` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `precoVenda` on the `Produto` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "public"."Produto" ALTER COLUMN "custoBase" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "margemAplicada" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "precoVenda" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."ItemAdicional" (
    "id" TEXT NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "codigoFornecedor" TEXT,
    "nome" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "linkCompra" TEXT,
    "custoBase" DOUBLE PRECISION NOT NULL,
    "fornecedorPadrao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemAdicional_codigoInterno_key" ON "public"."ItemAdicional"("codigoInterno");
