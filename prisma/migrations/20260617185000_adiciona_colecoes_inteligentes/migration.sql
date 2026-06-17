-- CreateTable
CREATE TABLE "ColecaoInteligente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "modoAtualizacao" TEXT NOT NULL DEFAULT 'SUGERIDA',
    "criteriosJson" JSONB,
    "configJson" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "geradaEm" TIMESTAMP(3),
    "aprovadaEm" TIMESTAMP(3),
    "desativadaEm" TIMESTAMP(3),

    CONSTRAINT "ColecaoInteligente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColecaoInteligenteProduto" (
    "id" TEXT NOT NULL,
    "colecaoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUGERIDO',
    "motivo" TEXT,
    "metricasJson" JSONB,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "adicionadoManual" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColecaoInteligenteProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColecaoInteligente_codigo_key" ON "ColecaoInteligente"("codigo");
CREATE UNIQUE INDEX "ColecaoInteligente_slug_key" ON "ColecaoInteligente"("slug");
CREATE INDEX "ColecaoInteligente_codigo_idx" ON "ColecaoInteligente"("codigo");
CREATE INDEX "ColecaoInteligente_slug_idx" ON "ColecaoInteligente"("slug");
CREATE INDEX "ColecaoInteligente_tipo_idx" ON "ColecaoInteligente"("tipo");
CREATE INDEX "ColecaoInteligente_status_idx" ON "ColecaoInteligente"("status");
CREATE INDEX "ColecaoInteligente_modoAtualizacao_idx" ON "ColecaoInteligente"("modoAtualizacao");
CREATE INDEX "ColecaoInteligente_geradaEm_idx" ON "ColecaoInteligente"("geradaEm");
CREATE UNIQUE INDEX "ColecaoInteligenteProduto_colecaoId_produtoId_key" ON "ColecaoInteligenteProduto"("colecaoId", "produtoId");
CREATE INDEX "ColecaoInteligenteProduto_colecaoId_idx" ON "ColecaoInteligenteProduto"("colecaoId");
CREATE INDEX "ColecaoInteligenteProduto_produtoId_idx" ON "ColecaoInteligenteProduto"("produtoId");
CREATE INDEX "ColecaoInteligenteProduto_ordem_idx" ON "ColecaoInteligenteProduto"("ordem");
CREATE INDEX "ColecaoInteligenteProduto_score_idx" ON "ColecaoInteligenteProduto"("score");
CREATE INDEX "ColecaoInteligenteProduto_status_idx" ON "ColecaoInteligenteProduto"("status");
CREATE INDEX "ColecaoInteligenteProduto_fixado_idx" ON "ColecaoInteligenteProduto"("fixado");

-- AddForeignKey
ALTER TABLE "ColecaoInteligenteProduto" ADD CONSTRAINT "ColecaoInteligenteProduto_colecaoId_fkey" FOREIGN KEY ("colecaoId") REFERENCES "ColecaoInteligente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColecaoInteligenteProduto" ADD CONSTRAINT "ColecaoInteligenteProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
