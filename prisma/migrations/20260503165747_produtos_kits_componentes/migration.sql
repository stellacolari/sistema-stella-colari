-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "tipoProduto" TEXT NOT NULL DEFAULT 'UNITARIO';

-- CreateTable
CREATE TABLE "ProdutoKitComponente" (
    "id" TEXT NOT NULL,
    "kitProdutoId" TEXT NOT NULL,
    "componenteProdutoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdutoKitComponente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProdutoKitComponente_kitProdutoId_idx" ON "ProdutoKitComponente"("kitProdutoId");

-- CreateIndex
CREATE INDEX "ProdutoKitComponente_componenteProdutoId_idx" ON "ProdutoKitComponente"("componenteProdutoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoKitComponente_kitProdutoId_componenteProdutoId_key" ON "ProdutoKitComponente"("kitProdutoId", "componenteProdutoId");

-- AddForeignKey
ALTER TABLE "ProdutoKitComponente" ADD CONSTRAINT "ProdutoKitComponente_kitProdutoId_fkey" FOREIGN KEY ("kitProdutoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoKitComponente" ADD CONSTRAINT "ProdutoKitComponente_componenteProdutoId_fkey" FOREIGN KEY ("componenteProdutoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
