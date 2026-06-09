ALTER TABLE "UsuarioAdmin" ALTER COLUMN "perfil" SET DEFAULT 'ACESSO_GERAL';

UPDATE "UsuarioAdmin"
SET "perfil" = 'ACESSO_GERAL'
WHERE "perfil" = 'ADMIN';
