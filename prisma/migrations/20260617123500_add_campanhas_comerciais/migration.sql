-- CreateTable
CREATE TABLE "CampanhaComercial" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "origem" TEXT NOT NULL,
    "recomendacaoId" TEXT,
    "produtoId" TEXT,
    "categoriaId" TEXT,
    "descricao" TEXT NOT NULL,
    "estrategia" TEXT NOT NULL,
    "publicoAlvo" TEXT,
    "canalPrincipal" TEXT NOT NULL,
    "canaisJson" JSONB,
    "produtosJson" JSONB,
    "acoesJson" JSONB,
    "metasJson" JSONB,
    "riscosJson" JSONB,
    "orcamentoSugerido" DOUBLE PRECISION,
    "descontoSugerido" DOUBLE PRECISION,
    "cupomSugerido" TEXT,
    "dataInicioSugerida" TIMESTAMP(3),
    "dataFimSugerida" TIMESTAMP(3),
    "resultadoJson" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "iniciadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "CampanhaComercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampanhaComercial_codigo_key" ON "CampanhaComercial"("codigo");

-- CreateIndex
CREATE INDEX "CampanhaComercial_codigo_idx" ON "CampanhaComercial"("codigo");

-- CreateIndex
CREATE INDEX "CampanhaComercial_tipo_idx" ON "CampanhaComercial"("tipo");

-- CreateIndex
CREATE INDEX "CampanhaComercial_status_idx" ON "CampanhaComercial"("status");

-- CreateIndex
CREATE INDEX "CampanhaComercial_origem_idx" ON "CampanhaComercial"("origem");

-- CreateIndex
CREATE INDEX "CampanhaComercial_recomendacaoId_idx" ON "CampanhaComercial"("recomendacaoId");

-- CreateIndex
CREATE INDEX "CampanhaComercial_produtoId_idx" ON "CampanhaComercial"("produtoId");

-- CreateIndex
CREATE INDEX "CampanhaComercial_categoriaId_idx" ON "CampanhaComercial"("categoriaId");

-- CreateIndex
CREATE INDEX "CampanhaComercial_criadoEm_idx" ON "CampanhaComercial"("criadoEm");

-- AddForeignKey
ALTER TABLE "CampanhaComercial" ADD CONSTRAINT "CampanhaComercial_recomendacaoId_fkey" FOREIGN KEY ("recomendacaoId") REFERENCES "RecomendacaoGerencial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampanhaComercial" ADD CONSTRAINT "CampanhaComercial_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampanhaComercial" ADD CONSTRAINT "CampanhaComercial_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
