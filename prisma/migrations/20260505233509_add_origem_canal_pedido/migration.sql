-- AlterTable
ALTER TABLE "PedidoOnline" ADD COLUMN     "codigoPedidoExterno" TEXT,
ADD COLUMN     "dadosOriginaisJson" JSONB,
ADD COLUMN     "origemCanal" TEXT NOT NULL DEFAULT 'LOJA_STELLA',
ADD COLUMN     "statusExterno" TEXT,
ADD COLUMN     "substatusExterno" TEXT;

-- CreateIndex
CREATE INDEX "PedidoOnline_origemCanal_idx" ON "PedidoOnline"("origemCanal");

-- CreateIndex
CREATE INDEX "PedidoOnline_codigoPedidoExterno_idx" ON "PedidoOnline"("codigoPedidoExterno");

-- CreateIndex
CREATE INDEX "PedidoOnline_origemCanal_codigoPedidoExterno_idx" ON "PedidoOnline"("origemCanal", "codigoPedidoExterno");
