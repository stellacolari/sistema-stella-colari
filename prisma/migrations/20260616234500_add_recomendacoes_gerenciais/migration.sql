-- CreateTable
CREATE TABLE "RecomendacaoGerencial" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "motivo" TEXT,
    "evidenciasJson" JSONB,
    "impactoEsperado" TEXT,
    "risco" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'NOVA',
    "acaoSugerida" TEXT,
    "linkAcao" TEXT,
    "origem" TEXT,
    "origemTipo" TEXT NOT NULL,
    "origemId" TEXT,
    "produtoId" TEXT,
    "categoriaId" TEXT,
    "periodoReferencia" TEXT,
    "prazoSugerido" TIMESTAMP(3),
    "resultadoObservado" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "aceitaEm" TIMESTAMP(3),
    "iniciadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "ignoradaEm" TIMESTAMP(3),
    "adiadaEm" TIMESTAMP(3),

    CONSTRAINT "RecomendacaoGerencial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecomendacaoGerencial_codigo_key" ON "RecomendacaoGerencial"("codigo");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_tipo_idx" ON "RecomendacaoGerencial"("tipo");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_prioridade_idx" ON "RecomendacaoGerencial"("prioridade");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_status_idx" ON "RecomendacaoGerencial"("status");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_origemTipo_idx" ON "RecomendacaoGerencial"("origemTipo");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_origemId_idx" ON "RecomendacaoGerencial"("origemId");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_produtoId_idx" ON "RecomendacaoGerencial"("produtoId");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_categoriaId_idx" ON "RecomendacaoGerencial"("categoriaId");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_periodoReferencia_idx" ON "RecomendacaoGerencial"("periodoReferencia");

-- CreateIndex
CREATE INDEX "RecomendacaoGerencial_criadoEm_idx" ON "RecomendacaoGerencial"("criadoEm");
