-- Estrutura aditiva do Gerenciador de Conteudo da Loja.
-- Os registros legados de pagina e bloco permanecem intactos para rollback.

CREATE TABLE "LojaConteudoDocumento" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PAGINA',
    "paginaId" TEXT,
    "slugPublico" TEXT,
    "contratoChave" TEXT NOT NULL,
    "contratoVersao" INTEGER NOT NULL DEFAULT 1,
    "rascunhoJson" JSONB NOT NULL,
    "revisaoRascunho" INTEGER NOT NULL DEFAULT 1,
    "versaoPublicadaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "modoEntrega" TEXT NOT NULL DEFAULT 'LEGADO',
    "inicioPublicacao" TIMESTAMP(3),
    "fimPublicacao" TIMESTAMP(3),
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "origemJson" JSONB,
    "criadoPorId" TEXT,
    "criadoPorNome" TEXT,
    "atualizadoPorId" TEXT,
    "atualizadoPorNome" TEXT,
    "publicadoPorId" TEXT,
    "publicadoPorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "publicadoEm" TIMESTAMP(3),

    CONSTRAINT "LojaConteudoDocumento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LojaConteudoVersao" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "contratoChave" TEXT NOT NULL,
    "contratoVersao" INTEGER NOT NULL,
    "conteudoJson" JSONB NOT NULL,
    "operacao" TEXT NOT NULL DEFAULT 'PUBLICACAO',
    "resumo" TEXT,
    "autorId" TEXT,
    "autorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojaConteudoVersao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LojaConteudoMidiaUso" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL DEFAULT 'DESKTOP',
    "escopo" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojaConteudoMidiaUso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LojaConteudoDocumento_chave_key" ON "LojaConteudoDocumento"("chave");
CREATE UNIQUE INDEX "LojaConteudoDocumento_paginaId_key" ON "LojaConteudoDocumento"("paginaId");
CREATE UNIQUE INDEX "LojaConteudoDocumento_slugPublico_key" ON "LojaConteudoDocumento"("slugPublico");
CREATE UNIQUE INDEX "LojaConteudoDocumento_versaoPublicadaId_key" ON "LojaConteudoDocumento"("versaoPublicadaId");
CREATE INDEX "LojaConteudoDocumento_tipo_idx" ON "LojaConteudoDocumento"("tipo");
CREATE INDEX "LojaConteudoDocumento_contratoChave_idx" ON "LojaConteudoDocumento"("contratoChave");
CREATE INDEX "LojaConteudoDocumento_status_idx" ON "LojaConteudoDocumento"("status");
CREATE INDEX "LojaConteudoDocumento_modoEntrega_idx" ON "LojaConteudoDocumento"("modoEntrega");
CREATE INDEX "LojaConteudoDocumento_inicioPublicacao_fimPublicacao_idx" ON "LojaConteudoDocumento"("inicioPublicacao", "fimPublicacao");

CREATE INDEX "LojaConteudoVersao_documentoId_criadoEm_idx" ON "LojaConteudoVersao"("documentoId", "criadoEm");
CREATE INDEX "LojaConteudoVersao_operacao_idx" ON "LojaConteudoVersao"("operacao");
CREATE UNIQUE INDEX "LojaConteudoVersao_documentoId_numero_key" ON "LojaConteudoVersao"("documentoId", "numero");

CREATE INDEX "LojaConteudoMidiaUso_assetId_idx" ON "LojaConteudoMidiaUso"("assetId");
CREATE INDEX "LojaConteudoMidiaUso_documentoId_escopo_idx" ON "LojaConteudoMidiaUso"("documentoId", "escopo");
CREATE UNIQUE INDEX "LojaConteudoMidiaUso_documentoId_assetId_slot_dispositivo_e_key" ON "LojaConteudoMidiaUso"("documentoId", "assetId", "slot", "dispositivo", "escopo");

ALTER TABLE "LojaConteudoDocumento" ADD CONSTRAINT "LojaConteudoDocumento_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "LojaPagina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LojaConteudoDocumento" ADD CONSTRAINT "LojaConteudoDocumento_versaoPublicadaId_fkey" FOREIGN KEY ("versaoPublicadaId") REFERENCES "LojaConteudoVersao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LojaConteudoVersao" ADD CONSTRAINT "LojaConteudoVersao_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "LojaConteudoDocumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LojaConteudoMidiaUso" ADD CONSTRAINT "LojaConteudoMidiaUso_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "LojaConteudoDocumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LojaConteudoMidiaUso" ADD CONSTRAINT "LojaConteudoMidiaUso_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MidiaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
