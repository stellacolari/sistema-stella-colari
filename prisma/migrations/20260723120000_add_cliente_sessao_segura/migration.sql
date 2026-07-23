-- CreateTable
CREATE TABLE "ClienteSessao" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "ultimoUsoEm" TIMESTAMP(3),
    "userAgentHash" TEXT,

    CONSTRAINT "ClienteSessao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClienteSessao_tokenHash_key" ON "ClienteSessao"("tokenHash");

-- CreateIndex
CREATE INDEX "ClienteSessao_clienteId_idx" ON "ClienteSessao"("clienteId");

-- CreateIndex
CREATE INDEX "ClienteSessao_expiraEm_idx" ON "ClienteSessao"("expiraEm");

-- CreateIndex
CREATE INDEX "ClienteSessao_clienteId_revogadoEm_expiraEm_idx" ON "ClienteSessao"("clienteId", "revogadoEm", "expiraEm");

-- AddForeignKey
ALTER TABLE "ClienteSessao" ADD CONSTRAINT "ClienteSessao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
