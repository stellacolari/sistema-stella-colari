-- CreateTable
CREATE TABLE "LojaFormularioResposta" (
    "id" TEXT NOT NULL,
    "paginaId" TEXT,
    "paginaTitulo" TEXT,
    "paginaSlug" TEXT,
    "paginaTipo" TEXT,
    "blocoId" TEXT,
    "blocoTipo" TEXT,
    "blocoTitulo" TEXT,
    "nome" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "mensagem" TEXT,
    "aceiteTermos" BOOLEAN NOT NULL DEFAULT false,
    "aceitaMarketing" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "origemUrl" TEXT,
    "userAgent" TEXT,
    "observacaoInterna" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaFormularioResposta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_paginaId_idx" ON "LojaFormularioResposta"("paginaId");

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_blocoId_idx" ON "LojaFormularioResposta"("blocoId");

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_status_idx" ON "LojaFormularioResposta"("status");

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_email_idx" ON "LojaFormularioResposta"("email");

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_telefone_idx" ON "LojaFormularioResposta"("telefone");

-- CreateIndex
CREATE INDEX "LojaFormularioResposta_criadoEm_idx" ON "LojaFormularioResposta"("criadoEm");
