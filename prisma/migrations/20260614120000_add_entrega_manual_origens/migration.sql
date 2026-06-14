CREATE TABLE IF NOT EXISTS "LojaEntregaManualOrigem" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "cep" TEXT NOT NULL,
  "rua" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "complemento" TEXT,
  "bairro" TEXT NOT NULL,
  "cidade" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "observacao" TEXT,
  "padrao" BOOLEAN NOT NULL DEFAULT false,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LojaEntregaManualOrigem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LojaEntregaManualOrigem_padrao_idx" ON "LojaEntregaManualOrigem"("padrao");
CREATE INDEX IF NOT EXISTS "LojaEntregaManualOrigem_ativo_idx" ON "LojaEntregaManualOrigem"("ativo");
