-- CreateTable
CREATE TABLE "NotificacaoSistema" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "resumo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOVA',
    "origemTipo" TEXT NOT NULL,
    "origemId" TEXT,
    "linkAcao" TEXT,
    "acaoLabel" TEXT,
    "metadataJson" JSONB,
    "expiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificacaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacaoUsuario" (
    "id" TEXT NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "perfilDestino" TEXT,
    "lidaEm" TIMESTAMP(3),
    "arquivadaEm" TIMESTAMP(3),
    "excluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificacaoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacaoCanalEnvio" (
    "id" TEXT NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'IN_APP',
    "destinatario" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoCanalEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificacaoSistema_tipo_idx" ON "NotificacaoSistema"("tipo");
CREATE INDEX "NotificacaoSistema_categoria_idx" ON "NotificacaoSistema"("categoria");
CREATE INDEX "NotificacaoSistema_prioridade_idx" ON "NotificacaoSistema"("prioridade");
CREATE INDEX "NotificacaoSistema_status_idx" ON "NotificacaoSistema"("status");
CREATE INDEX "NotificacaoSistema_origemTipo_idx" ON "NotificacaoSistema"("origemTipo");
CREATE INDEX "NotificacaoSistema_origemId_idx" ON "NotificacaoSistema"("origemId");
CREATE INDEX "NotificacaoSistema_linkAcao_idx" ON "NotificacaoSistema"("linkAcao");
CREATE INDEX "NotificacaoSistema_criadoEm_idx" ON "NotificacaoSistema"("criadoEm");
CREATE INDEX "NotificacaoSistema_expiraEm_idx" ON "NotificacaoSistema"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoUsuario_notificacaoId_usuarioId_key" ON "NotificacaoUsuario"("notificacaoId", "usuarioId");
CREATE UNIQUE INDEX "NotificacaoUsuario_notificacaoId_perfilDestino_key" ON "NotificacaoUsuario"("notificacaoId", "perfilDestino");
CREATE INDEX "NotificacaoUsuario_notificacaoId_idx" ON "NotificacaoUsuario"("notificacaoId");
CREATE INDEX "NotificacaoUsuario_usuarioId_idx" ON "NotificacaoUsuario"("usuarioId");
CREATE INDEX "NotificacaoUsuario_perfilDestino_idx" ON "NotificacaoUsuario"("perfilDestino");
CREATE INDEX "NotificacaoUsuario_lidaEm_idx" ON "NotificacaoUsuario"("lidaEm");
CREATE INDEX "NotificacaoUsuario_arquivadaEm_idx" ON "NotificacaoUsuario"("arquivadaEm");
CREATE INDEX "NotificacaoUsuario_excluidaEm_idx" ON "NotificacaoUsuario"("excluidaEm");

-- CreateIndex
CREATE INDEX "NotificacaoCanalEnvio_notificacaoId_idx" ON "NotificacaoCanalEnvio"("notificacaoId");
CREATE INDEX "NotificacaoCanalEnvio_canal_idx" ON "NotificacaoCanalEnvio"("canal");
CREATE INDEX "NotificacaoCanalEnvio_status_idx" ON "NotificacaoCanalEnvio"("status");
CREATE INDEX "NotificacaoCanalEnvio_enviadoEm_idx" ON "NotificacaoCanalEnvio"("enviadoEm");

-- AddForeignKey
ALTER TABLE "NotificacaoUsuario" ADD CONSTRAINT "NotificacaoUsuario_notificacaoId_fkey" FOREIGN KEY ("notificacaoId") REFERENCES "NotificacaoSistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificacaoUsuario" ADD CONSTRAINT "NotificacaoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "UsuarioAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificacaoCanalEnvio" ADD CONSTRAINT "NotificacaoCanalEnvio_notificacaoId_fkey" FOREIGN KEY ("notificacaoId") REFERENCES "NotificacaoSistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
