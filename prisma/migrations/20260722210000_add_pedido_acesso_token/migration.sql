-- Token opaco para acesso seguro ao acompanhamento publico de pedidos.
-- O token bruto nunca e persistido; apenas seu hash SHA-256.

ALTER TABLE "PedidoOnline"
ADD COLUMN "pedidoAcessoTokenHash" TEXT,
ADD COLUMN "pedidoAcessoCriadoEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "PedidoOnline_pedidoAcessoTokenHash_key"
ON "PedidoOnline"("pedidoAcessoTokenHash");
