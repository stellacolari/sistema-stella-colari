CREATE TABLE "LojaFreteConfiguracao" (
  "id" TEXT NOT NULL,
  "chave" TEXT NOT NULL DEFAULT 'PADRAO',
  "provedor" TEXT NOT NULL DEFAULT 'MELHOR_ENVIO',
  "cepOrigem" TEXT,
  "ambiente" TEXT NOT NULL DEFAULT 'sandbox',
  "userAgent" TEXT,
  "pesoFallbackKg" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  "alturaFallbackCm" DOUBLE PRECISION NOT NULL DEFAULT 4,
  "larguraFallbackCm" DOUBLE PRECISION NOT NULL DEFAULT 12,
  "comprimentoFallbackCm" DOUBLE PRECISION NOT NULL DEFAULT 18,
  "prazoAdicionalDias" INTEGER NOT NULL DEFAULT 0,
  "valorAdicional" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "retiradaLocalHabilitada" BOOLEAN NOT NULL DEFAULT false,
  "retiradaLocalTexto" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LojaFreteConfiguracao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LojaFreteConfiguracao_chave_key" ON "LojaFreteConfiguracao"("chave");
