CREATE TABLE "UsuarioAdmin" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senhaHash" TEXT NOT NULL,
  "perfil" TEXT NOT NULL DEFAULT 'ADMIN',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ultimoLoginEm" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsuarioAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsuarioAdmin_email_key" ON "UsuarioAdmin"("email");
CREATE INDEX "UsuarioAdmin_email_idx" ON "UsuarioAdmin"("email");
CREATE INDEX "UsuarioAdmin_ativo_idx" ON "UsuarioAdmin"("ativo");
CREATE INDEX "UsuarioAdmin_perfil_idx" ON "UsuarioAdmin"("perfil");
