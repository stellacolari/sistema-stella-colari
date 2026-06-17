import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  contarNotificacoesNaoLidas,
  listarNotificacoes,
} from "@/lib/notificacoes/notificacoes";
import NotificacoesClient from "@/components/notificacoes/NotificacoesClient";

export const metadata: Metadata = {
  title: "Caixa de Entrada | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const usuario = await exigirAdmin();
  const [notificacoes, contadores] = await Promise.all([
    listarNotificacoes({ usuarioId: usuario.id, perfil: usuario.perfil, take: 150 }),
    contarNotificacoesNaoLidas(usuario.id, usuario.perfil),
  ]);

  return (
    <NotificacoesClient
      perfil={usuario.perfil}
      notificacoes={notificacoes.map((item) => ({
        id: item.id,
        tipo: item.tipo,
        categoria: item.categoria,
        prioridade: item.prioridade,
        titulo: item.titulo,
        descricao: item.descricao,
        resumo: item.resumo,
        status: item.status,
        origemTipo: item.origemTipo,
        origemId: item.origemId,
        linkAcao: item.linkAcao,
        acaoLabel: item.acaoLabel,
        metadataJson: item.metadataJson,
        criadoEm: item.criadoEm.toISOString(),
        atualizadoEm: item.atualizadoEm.toISOString(),
        lidaEm: item.destinatarios[0]?.lidaEm?.toISOString() || null,
        arquivadaEm: item.destinatarios[0]?.arquivadaEm?.toISOString() || null,
      }))}
      contadores={contadores}
    />
  );
}
