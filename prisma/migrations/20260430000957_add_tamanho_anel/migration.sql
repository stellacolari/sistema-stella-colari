/*
  Warnings:

  - A unique constraint covering the columns `[produtoId,tamanhoAnel]` on the table `EstoqueProduto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "EstoqueProduto_produtoId_key";

-- AlterTable
ALTER TABLE "CompraItem" ADD COLUMN     "tamanhoAnel" TEXT;

-- AlterTable
ALTER TABLE "EstoqueProduto" ADD COLUMN     "tamanhoAnel" TEXT NOT NULL DEFAULT 'UNICO';

-- AlterTable
ALTER TABLE "Movimentacao" ADD COLUMN     "tamanhoAnel" TEXT;

-- AlterTable
ALTER TABLE "VendaItem" ADD COLUMN     "tamanhoAnel" TEXT;

-- CreateIndex
CREATE INDEX "EstoqueProduto_produtoId_idx" ON "EstoqueProduto"("produtoId");

-- CreateIndex
CREATE INDEX "EstoqueProduto_tamanhoAnel_idx" ON "EstoqueProduto"("tamanhoAnel");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueProduto_produtoId_tamanhoAnel_key" ON "EstoqueProduto"("produtoId", "tamanhoAnel");
