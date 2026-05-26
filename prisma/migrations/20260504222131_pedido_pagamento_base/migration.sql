-- AlterTable
ALTER TABLE "PedidoOnline" ADD COLUMN     "gatewayPagamento" TEXT,
ADD COLUMN     "gatewayPagamentoId" TEXT,
ADD COLUMN     "gatewayPedidoId" TEXT,
ADD COLUMN     "metodoPagamento" TEXT,
ADD COLUMN     "pagamentoObservacao" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3),
ADD COLUMN     "statusPagamento" TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
ADD COLUMN     "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PedidoOnline_statusPagamento_idx" ON "PedidoOnline"("statusPagamento");

-- CreateIndex
CREATE INDEX "PedidoOnline_gatewayPedidoId_idx" ON "PedidoOnline"("gatewayPedidoId");

-- CreateIndex
CREATE INDEX "PedidoOnline_gatewayPagamentoId_idx" ON "PedidoOnline"("gatewayPagamentoId");

-- CreateIndex
CREATE INDEX "PedidoOnline_pagoEm_idx" ON "PedidoOnline"("pagoEm");
