-- CreateTable
CREATE TABLE "LojaMenuRodapeConfiguracao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL DEFAULT 'PADRAO',
    "configJson" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaMenuRodapeConfiguracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LojaMenuRodapeConfiguracao_chave_key" ON "LojaMenuRodapeConfiguracao"("chave");
