CREATE TABLE "PedidoOnlineItemEmbalagemPresente" (
  "id" TEXT NOT NULL,
  "pedidoOnlineId" TEXT NOT NULL,
  "pedidoOnlineItemId" TEXT NOT NULL,
  "embalagemModeloId" TEXT,
  "nomeSnapshot" TEXT NOT NULL,
  "descricaoSnapshot" TEXT,
  "imagemUrlSnapshot" TEXT,
  "precoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantidade" INTEGER NOT NULL DEFAULT 1,
  "mensagem" TEXT,
  "substituiEmbalagemPadrao" BOOLEAN NOT NULL DEFAULT false,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PedidoOnlineItemEmbalagemPresente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PedidoOnlineItemEmbalagemPresente_pedidoOnlineItemId_key"
  ON "PedidoOnlineItemEmbalagemPresente"("pedidoOnlineItemId");

CREATE INDEX "PedidoOnlineItemEmbalagemPresente_pedidoOnlineId_idx"
  ON "PedidoOnlineItemEmbalagemPresente"("pedidoOnlineId");

CREATE INDEX "PedidoOnlineItemEmbalagemPresente_embalagemModeloId_idx"
  ON "PedidoOnlineItemEmbalagemPresente"("embalagemModeloId");

ALTER TABLE "PedidoOnlineItemEmbalagemPresente"
  ADD CONSTRAINT "PedidoOnlineItemEmbalagemPresente_pedidoOnlineId_fkey"
  FOREIGN KEY ("pedidoOnlineId") REFERENCES "PedidoOnline"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedidoOnlineItemEmbalagemPresente"
  ADD CONSTRAINT "PedidoOnlineItemEmbalagemPresente_pedidoOnlineItemId_fkey"
  FOREIGN KEY ("pedidoOnlineItemId") REFERENCES "PedidoOnlineItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedidoOnlineItemEmbalagemPresente"
  ADD CONSTRAINT "PedidoOnlineItemEmbalagemPresente_embalagemModeloId_fkey"
  FOREIGN KEY ("embalagemModeloId") REFERENCES "EmbalagemModelo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
