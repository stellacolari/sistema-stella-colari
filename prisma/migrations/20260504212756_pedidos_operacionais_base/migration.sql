-- CreateTable
CREATE TABLE "PedidoEnvio" (
    "id" TEXT NOT NULL,
    "pedidoOnlineId" TEXT NOT NULL,
    "tipoEntrega" TEXT NOT NULL DEFAULT 'ENTREGA',
    "transportadora" TEXT,
    "servico" TEXT,
    "statusEnvio" TEXT NOT NULL DEFAULT 'PENDENTE',
    "cepOrigem" TEXT,
    "cepDestino" TEXT,
    "pesoGramas" DOUBLE PRECISION,
    "alturaCm" DOUBLE PRECISION,
    "larguraCm" DOUBLE PRECISION,
    "comprimentoCm" DOUBLE PRECISION,
    "valorFrete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prazoDias" INTEGER,
    "codigoRastreio" TEXT,
    "etiquetaUrl" TEXT,
    "etiquetaPdfUrl" TEXT,
    "declaracaoConteudoUrl" TEXT,
    "gatewayLogistico" TEXT,
    "gatewayEnvioId" TEXT,
    "postadoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoStatusHistorico" (
    "id" TEXT NOT NULL,
    "pedidoOnlineId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL DEFAULT 'MANUAL',
    "origem" TEXT NOT NULL DEFAULT 'SISTEMA',
    "usuarioNome" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoStatusHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEnvio_pedidoOnlineId_key" ON "PedidoEnvio"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoEnvio_pedidoOnlineId_idx" ON "PedidoEnvio"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoEnvio_tipoEntrega_idx" ON "PedidoEnvio"("tipoEntrega");

-- CreateIndex
CREATE INDEX "PedidoEnvio_statusEnvio_idx" ON "PedidoEnvio"("statusEnvio");

-- CreateIndex
CREATE INDEX "PedidoEnvio_codigoRastreio_idx" ON "PedidoEnvio"("codigoRastreio");

-- CreateIndex
CREATE INDEX "PedidoEnvio_transportadora_idx" ON "PedidoEnvio"("transportadora");

-- CreateIndex
CREATE INDEX "PedidoStatusHistorico_pedidoOnlineId_idx" ON "PedidoStatusHistorico"("pedidoOnlineId");

-- CreateIndex
CREATE INDEX "PedidoStatusHistorico_statusNovo_idx" ON "PedidoStatusHistorico"("statusNovo");

-- CreateIndex
CREATE INDEX "PedidoStatusHistorico_tipoEvento_idx" ON "PedidoStatusHistorico"("tipoEvento");

-- CreateIndex
CREATE INDEX "PedidoStatusHistorico_criadoEm_idx" ON "PedidoStatusHistorico"("criadoEm");

-- AddForeignKey
ALTER TABLE "PedidoEnvio" ADD CONSTRAINT "PedidoEnvio_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoStatusHistorico" ADD CONSTRAINT "PedidoStatusHistorico_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
