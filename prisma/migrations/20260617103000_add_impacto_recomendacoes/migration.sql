-- CreateTable
CREATE TABLE "RecomendacaoGerencialImpacto" (
    "id" TEXT NOT NULL,
    "recomendacaoId" TEXT NOT NULL,
    "janelaDias" INTEGER NOT NULL,
    "statusImpacto" TEXT NOT NULL,
    "scoreImpacto" DOUBLE PRECISION NOT NULL,
    "resumo" TEXT NOT NULL,
    "metricasAntesJson" JSONB,
    "metricasDepoisJson" JSONB,
    "comparativoJson" JSONB,
    "proximaAcaoSugerida" TEXT,
    "avaliadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecomendacaoGerencialImpacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecomendacaoGerencialImpacto_recomendacaoId_janelaDias_key" ON "RecomendacaoGerencialImpacto"("recomendacaoId", "janelaDias");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencialImpacto_recomendacaoId_idx" ON "RecomendacaoGerencialImpacto"("recomendacaoId");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencialImpacto_janelaDias_idx" ON "RecomendacaoGerencialImpacto"("janelaDias");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencialImpacto_statusImpacto_idx" ON "RecomendacaoGerencialImpacto"("statusImpacto");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencialImpacto_avaliadoEm_idx" ON "RecomendacaoGerencialImpacto"("avaliadoEm");

-- AddForeignKey
ALTER TABLE "RecomendacaoGerencialImpacto" ADD CONSTRAINT "RecomendacaoGerencialImpacto_recomendacaoId_fkey" FOREIGN KEY ("recomendacaoId") REFERENCES "RecomendacaoGerencial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
