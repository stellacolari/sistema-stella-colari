-- CreateTable
CREATE TABLE "LojaPagina" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PAGINA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaPagina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LojaPaginaBloco" (
    "id" TEXT NOT NULL,
    "paginaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaPaginaBloco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LojaPagina_slug_key" ON "LojaPagina"("slug");

-- CreateIndex
CREATE INDEX "LojaPagina_slug_idx" ON "LojaPagina"("slug");

-- CreateIndex
CREATE INDEX "LojaPagina_tipo_idx" ON "LojaPagina"("tipo");

-- CreateIndex
CREATE INDEX "LojaPagina_ativo_idx" ON "LojaPagina"("ativo");

-- CreateIndex
CREATE INDEX "LojaPaginaBloco_paginaId_idx" ON "LojaPaginaBloco"("paginaId");

-- CreateIndex
CREATE INDEX "LojaPaginaBloco_ordem_idx" ON "LojaPaginaBloco"("ordem");

-- CreateIndex
CREATE INDEX "LojaPaginaBloco_tipo_idx" ON "LojaPaginaBloco"("tipo");

-- CreateIndex
CREATE INDEX "LojaPaginaBloco_ativo_idx" ON "LojaPaginaBloco"("ativo");

-- AddForeignKey
ALTER TABLE "LojaPaginaBloco" ADD CONSTRAINT "LojaPaginaBloco_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "LojaPagina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
