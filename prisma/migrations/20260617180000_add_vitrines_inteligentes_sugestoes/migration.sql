-- CreateTable
CREATE TABLE "VitrineInteligenteSugestao" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGERIDA',
    "origem" TEXT NOT NULL,
    "campanhaId" TEXT,
    "recomendacaoId" TEXT,
    "produtoId" TEXT,
    "categoriaId" TEXT,
    "paginaDestinoId" TEXT,
    "blocoCriadoId" TEXT,
    "produtosJson" JSONB NOT NULL,
    "criteriosJson" JSONB,
    "configBlocoJson" JSONB NOT NULL,
    "metricasJson" JSONB,
    "justificativa" TEXT,
    "risco" TEXT,
    "acaoSugerida" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "aplicadaEm" TIMESTAMP(3),
    "ignoradaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "VitrineInteligenteSugestao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VitrineInteligenteSugestao_codigo_key" ON "VitrineInteligenteSugestao"("codigo");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_codigo_idx" ON "VitrineInteligenteSugestao"("codigo");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_tipo_idx" ON "VitrineInteligenteSugestao"("tipo");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_status_idx" ON "VitrineInteligenteSugestao"("status");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_origem_idx" ON "VitrineInteligenteSugestao"("origem");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_campanhaId_idx" ON "VitrineInteligenteSugestao"("campanhaId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_recomendacaoId_idx" ON "VitrineInteligenteSugestao"("recomendacaoId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_produtoId_idx" ON "VitrineInteligenteSugestao"("produtoId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_categoriaId_idx" ON "VitrineInteligenteSugestao"("categoriaId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_paginaDestinoId_idx" ON "VitrineInteligenteSugestao"("paginaDestinoId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_blocoCriadoId_idx" ON "VitrineInteligenteSugestao"("blocoCriadoId");

-- CreateIndex
CREATE INDEX "VitrineInteligenteSugestao_criadoEm_idx" ON "VitrineInteligenteSugestao"("criadoEm");

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "CampanhaComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_recomendacaoId_fkey" FOREIGN KEY ("recomendacaoId") REFERENCES "RecomendacaoGerencial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_paginaDestinoId_fkey" FOREIGN KEY ("paginaDestinoId") REFERENCES "LojaPagina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineInteligenteSugestao" ADD CONSTRAINT "VitrineInteligenteSugestao_blocoCriadoId_fkey" FOREIGN KEY ("blocoCriadoId") REFERENCES "LojaPaginaBloco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
