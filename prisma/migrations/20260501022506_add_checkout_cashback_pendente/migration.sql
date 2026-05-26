-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "cashbackSaldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "origemCadastro" TEXT,
ADD COLUMN     "senhaHash" TEXT;

-- CreateTable
CREATE TABLE "PedidoOnline" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteCriadoCheckout" BOOLEAN NOT NULL DEFAULT false,
    "nomeCliente" TEXT NOT NULL,
    "telefoneCliente" TEXT NOT NULL,
    "emailCliente" TEXT,
    "documento" TEXT,
    "cep" TEXT,
    "rua" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackBaseValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackPrevistoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackCreditadoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackCreditadoEm" TIMESTAMP(3),
    "cashbackStatus" TEXT NOT NULL DEFAULT 'NAO_APLICAVEL',
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoOnline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoOnlineItem" (
    "id" TEXT NOT NULL,
    "pedidoOnlineId" TEXT NOT NULL,
    "produtoId" TEXT,
    "codigoInterno" TEXT NOT NULL,
    "nomeProduto" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "categoria" TEXT NOT NULL,
    "tamanhoAnel" TEXT,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "precoOriginal" DOUBLE PRECISION,
    "descontoPercentual" DOUBLE PRECISION,
    "geraCashback" BOOLEAN NOT NULL DEFAULT false,
    "cashbackBaseValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoOnlineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteCashbackMovimentacao" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EFETIVADO',
    "origemTipo" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteCashbackMovimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoOnline_codigo_key" ON "PedidoOnline"("codigo");

-- CreateIndex
CREATE INDEX "PedidoOnline_clienteId_idx" ON "PedidoOnline"("clienteId");

-- CreateIndex
CREATE INDEX "PedidoOnline_codigo_idx" ON "PedidoOnline"("codigo");

-- CreateIndex
CREATE INDEX "PedidoOnline_status_idx" ON "PedidoOnline"("status");

-- CreateIndex
CREATE INDEX "PedidoOnline_cashbackStatus_idx" ON "PedidoOnline"("cashbackStatus");

-- CreateIndex
CREATE INDEX "PedidoOnlineItem_pedidoOnlineId_idx" ON "PedidoOnlineItem"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoOnlineItem_produtoId_idx" ON "PedidoOnlineItem"("produtoId");

-- CreateIndex
CREATE INDEX "PedidoOnlineItem_codigoInterno_idx" ON "PedidoOnlineItem"("codigoInterno");

-- CreateIndex
CREATE INDEX "ClienteCashbackMovimentacao_clienteId_idx" ON "ClienteCashbackMovimentacao"("clienteId");

-- CreateIndex
CREATE INDEX "ClienteCashbackMovimentacao_origemId_idx" ON "ClienteCashbackMovimentacao"("origemId");

-- AddForeignKey
ALTER TABLE "PedidoOnline" ADD CONSTRAINT "PedidoOnline_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItem" ADD CONSTRAINT "PedidoOnlineItem_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteCashbackMovimentacao" ADD CONSTRAINT "ClienteCashbackMovimentacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
