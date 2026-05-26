-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'VENDA_FINALIZADA';

-- CreateTable
CREATE TABLE "MovimentacaoAdicional" (
    "id" TEXT NOT NULL,
    "movimentacaoId" TEXT NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "nomeItem" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL,
    "custoTotal" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentacaoAdicional_movimentacaoId_idx" ON "MovimentacaoAdicional"("movimentacaoId");

-- CreateIndex
CREATE INDEX "MovimentacaoAdicional_codigoItem_idx" ON "MovimentacaoAdicional"("codigoItem");

-- AddForeignKey
ALTER TABLE "MovimentacaoAdicional" ADD CONSTRAINT "MovimentacaoAdicional_movimentacaoId_fkey" FOREIGN KEY ("movimentacaoId") REFERENCES "Movimentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
