-- CreateTable
CREATE TABLE "MidiaAsset" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlThumb" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'IMAGEM',
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "alt" TEXT,
    "descricao" TEXT,
    "tagsJson" JSONB,
    "origem" TEXT NOT NULL DEFAULT 'BUILDER',
    "provider" TEXT NOT NULL DEFAULT 'VERCEL_BLOB',
    "providerKey" TEXT,
    "pasta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MidiaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MidiaAsset_tipo_idx" ON "MidiaAsset"("tipo");

-- CreateIndex
CREATE INDEX "MidiaAsset_status_idx" ON "MidiaAsset"("status");

-- CreateIndex
CREATE INDEX "MidiaAsset_origem_idx" ON "MidiaAsset"("origem");

-- CreateIndex
CREATE INDEX "MidiaAsset_pasta_idx" ON "MidiaAsset"("pasta");

-- CreateIndex
CREATE INDEX "MidiaAsset_criadoEm_idx" ON "MidiaAsset"("criadoEm");
