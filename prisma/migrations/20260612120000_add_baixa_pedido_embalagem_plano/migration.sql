-- Add idempotent stock lowering metadata for persisted packaging plans.
ALTER TABLE "PedidoEmbalagemPlano" ADD COLUMN "baixadoEm" TIMESTAMP(3);
ALTER TABLE "PedidoEmbalagemPlano" ADD COLUMN "baixadoPor" TEXT;
ALTER TABLE "PedidoEmbalagemPlano" ADD COLUMN "baixaOrigem" TEXT;
ALTER TABLE "PedidoEmbalagemPlano" ADD COLUMN "erroBaixa" TEXT;
