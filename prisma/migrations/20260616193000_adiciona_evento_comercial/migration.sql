-- CreateTable
CREATE TABLE "EventoComercial" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "produtoId" TEXT,
    "categoriaId" TEXT,
    "paginaId" TEXT,
    "blocoId" TEXT,
    "clienteId" TEXT,
    "pedidoId" TEXT,
    "termoBusca" TEXT,
    "origem" TEXT,
    "sessionId" TEXT,
    "metadataJson" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoComercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoComercial_tipo_idx" ON "EventoComercial"("tipo");

-- CreateIndex
CREATE INDEX "EventoComercial_produtoId_idx" ON "EventoComercial"("produtoId");

-- CreateIndex
CREATE INDEX "EventoComercial_categoriaId_idx" ON "EventoComercial"("categoriaId");

-- CreateIndex
CREATE INDEX "EventoComercial_paginaId_idx" ON "EventoComercial"("paginaId");

-- CreateIndex
CREATE INDEX "EventoComercial_blocoId_idx" ON "EventoComercial"("blocoId");

-- CreateIndex
CREATE INDEX "EventoComercial_clienteId_idx" ON "EventoComercial"("clienteId");

-- CreateIndex
CREATE INDEX "EventoComercial_pedidoId_idx" ON "EventoComercial"("pedidoId");

-- CreateIndex
CREATE INDEX "EventoComercial_sessionId_idx" ON "EventoComercial"("sessionId");

-- CreateIndex
CREATE INDEX "EventoComercial_termoBusca_idx" ON "EventoComercial"("termoBusca");

-- CreateIndex
CREATE INDEX "EventoComercial_criadoEm_idx" ON "EventoComercial"("criadoEm");

-- CreateIndex
CREATE INDEX "EventoComercial_tipo_criadoEm_idx" ON "EventoComercial"("tipo", "criadoEm");

-- CreateIndex
CREATE INDEX "EventoComercial_sessionId_criadoEm_idx" ON "EventoComercial"("sessionId", "criadoEm");

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "LojaPagina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_blocoId_fkey" FOREIGN KEY ("blocoId") REFERENCES "LojaPaginaBloco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoComercial" ADD CONSTRAINT "EventoComercial_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoOnline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
