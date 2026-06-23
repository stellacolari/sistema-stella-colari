-- CreateTable
CREATE TABLE "ClienteConsentimento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'ADMIN_MANUAL',
    "versaoPolitica" TEXT,
    "registradoPorAdminId" TEXT,
    "registradoPorAdminNome" TEXT,
    "consentidoEm" TIMESTAMP(3),
    "revogadoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteConsentimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClienteConsentimento_clienteId_idx" ON "ClienteConsentimento"("clienteId");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_finalidade_idx" ON "ClienteConsentimento"("finalidade");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_canal_idx" ON "ClienteConsentimento"("canal");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_status_idx" ON "ClienteConsentimento"("status");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_registradoPorAdminId_idx" ON "ClienteConsentimento"("registradoPorAdminId");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_criadoEm_idx" ON "ClienteConsentimento"("criadoEm");

-- CreateIndex
CREATE INDEX "ClienteConsentimento_clienteId_finalidade_canal_criadoEm_idx" ON "ClienteConsentimento"("clienteId", "finalidade", "canal", "criadoEm");

-- AddForeignKey
ALTER TABLE "ClienteConsentimento" ADD CONSTRAINT "ClienteConsentimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteConsentimento" ADD CONSTRAINT "ClienteConsentimento_registradoPorAdminId_fkey" FOREIGN KEY ("registradoPorAdminId") REFERENCES "UsuarioAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
