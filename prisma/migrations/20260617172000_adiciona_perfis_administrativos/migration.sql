-- CreateTable
CREATE TABLE "PerfilAdministrativo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoBase" TEXT NOT NULL DEFAULT 'PERSONALIZADO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "permissoesJson" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilAdministrativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraNotificacaoPerfil" (
    "id" TEXT NOT NULL,
    "tipoNotificacao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridadeMinima" TEXT NOT NULL DEFAULT 'INFO',
    "perfilId" TEXT,
    "usuarioId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "canalInApp" BOOLEAN NOT NULL DEFAULT true,
    "canalWhatsappFuturo" BOOLEAN NOT NULL DEFAULT false,
    "canalSmsFuturo" BOOLEAN NOT NULL DEFAULT false,
    "canalEmailFuturo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraNotificacaoPerfil_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "UsuarioAdmin" ADD COLUMN "perfilAdministrativoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PerfilAdministrativo_codigo_key" ON "PerfilAdministrativo"("codigo");
CREATE INDEX "PerfilAdministrativo_codigo_idx" ON "PerfilAdministrativo"("codigo");
CREATE INDEX "PerfilAdministrativo_tipoBase_idx" ON "PerfilAdministrativo"("tipoBase");
CREATE INDEX "PerfilAdministrativo_ativo_idx" ON "PerfilAdministrativo"("ativo");
CREATE INDEX "RegraNotificacaoPerfil_tipoNotificacao_idx" ON "RegraNotificacaoPerfil"("tipoNotificacao");
CREATE INDEX "RegraNotificacaoPerfil_categoria_idx" ON "RegraNotificacaoPerfil"("categoria");
CREATE INDEX "RegraNotificacaoPerfil_prioridadeMinima_idx" ON "RegraNotificacaoPerfil"("prioridadeMinima");
CREATE INDEX "RegraNotificacaoPerfil_perfilId_idx" ON "RegraNotificacaoPerfil"("perfilId");
CREATE INDEX "RegraNotificacaoPerfil_usuarioId_idx" ON "RegraNotificacaoPerfil"("usuarioId");
CREATE INDEX "RegraNotificacaoPerfil_ativo_idx" ON "RegraNotificacaoPerfil"("ativo");
CREATE INDEX "UsuarioAdmin_perfilAdministrativoId_idx" ON "UsuarioAdmin"("perfilAdministrativoId");

-- AddForeignKey
ALTER TABLE "UsuarioAdmin" ADD CONSTRAINT "UsuarioAdmin_perfilAdministrativoId_fkey" FOREIGN KEY ("perfilAdministrativoId") REFERENCES "PerfilAdministrativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegraNotificacaoPerfil" ADD CONSTRAINT "RegraNotificacaoPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilAdministrativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegraNotificacaoPerfil" ADD CONSTRAINT "RegraNotificacaoPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "UsuarioAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
