-- CreateTable
CREATE TABLE "CategoriaOpcaoAdicional" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "itemPadraoSubstituidoId" TEXT,
    "itemAdicionalConsumidoId" TEXT NOT NULL,
    "valorVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaOpcaoAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoOnlineItemAdicional" (
    "id" TEXT NOT NULL,
    "pedidoOnlineItemId" TEXT NOT NULL,
    "opcaoAdicionalId" TEXT,
    "nome" TEXT NOT NULL,
    "itemPadraoSubstituidoId" TEXT,
    "itemAdicionalConsumidoId" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorVendaUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorVendaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoOnlineId" TEXT,

    CONSTRAINT "PedidoOnlineItemAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoriaOpcaoAdicional_categoriaId_idx" ON "CategoriaOpcaoAdicional"("categoriaId");

-- CreateIndex
CREATE INDEX "CategoriaOpcaoAdicional_itemPadraoSubstituidoId_idx" ON "CategoriaOpcaoAdicional"("itemPadraoSubstituidoId");

-- CreateIndex
CREATE INDEX "CategoriaOpcaoAdicional_itemAdicionalConsumidoId_idx" ON "CategoriaOpcaoAdicional"("itemAdicionalConsumidoId");

-- CreateIndex
CREATE INDEX "CategoriaOpcaoAdicional_ativo_idx" ON "CategoriaOpcaoAdicional"("ativo");

-- CreateIndex
CREATE INDEX "PedidoOnlineItemAdicional_pedidoOnlineItemId_idx" ON "PedidoOnlineItemAdicional"("pedidoOnlineItemId");

-- CreateIndex
CREATE INDEX "PedidoOnlineItemAdicional_opcaoAdicionalId_idx" ON "PedidoOnlineItemAdicional"("opcaoAdicionalId");

-- CreateIndex
CREATE INDEX "PedidoOnlineItemAdicional_itemPadraoSubstituidoId_idx" ON "PedidoOnlineItemAdicional"("itemPadraoSubstituidoId");

-- CreateIndex
CREATE INDEX "PedidoOnlineItemAdicional_itemAdicionalConsumidoId_idx" ON "PedidoOnlineItemAdicional"("itemAdicionalConsumidoId");

-- AddForeignKey
ALTER TABLE "CategoriaOpcaoAdicional" ADD CONSTRAINT "CategoriaOpcaoAdicional_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaOpcaoAdicional" ADD CONSTRAINT "CategoriaOpcaoAdicional_itemPadraoSubstituidoId_fkey" FOREIGN KEY ("itemPadraoSubstituidoId") REFERENCES "ItemAdicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaOpcaoAdicional" ADD CONSTRAINT "CategoriaOpcaoAdicional_itemAdicionalConsumidoId_fkey" FOREIGN KEY ("itemAdicionalConsumidoId") REFERENCES "ItemAdicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_pedidoOnlineItemId_fkey" FOREIGN KEY ("pedidoOnlineItemId") REFERENCES "PedidoOnlineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_opcaoAdicionalId_fkey" FOREIGN KEY ("opcaoAdicionalId") REFERENCES "CategoriaOpcaoAdicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_itemPadraoSubstituidoId_fkey" FOREIGN KEY ("itemPadraoSubstituidoId") REFERENCES "ItemAdicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_itemAdicionalConsumidoId_fkey" FOREIGN KEY ("itemAdicionalConsumidoId") REFERENCES "ItemAdicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoOnlineItemAdicional" ADD CONSTRAINT "PedidoOnlineItemAdicional_pedidoOnlineId_fkey" FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
