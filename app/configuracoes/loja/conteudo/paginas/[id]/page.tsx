import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConteudoPaginaEditorClient from "@/components/configuracoes/loja/conteudo/ConteudoPaginaEditorClient";
import {
  exigirAdminComPermissao,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import {
  buscarPaginaConteudoBase,
  montarEstadoEditorConteudo,
} from "@/lib/loja/conteudo/repository.server";
import { rotaPublicaConteudoPagina } from "@/lib/loja/conteudo/public-route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar conteúdo | Stella Colari",
};

export default async function ConteudoPaginaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirAdminComPermissao("lojaOnline", "ver");
  const { id } = await params;
  const pagina = await buscarPaginaConteudoBase(id);
  if (!pagina) notFound();

  const [estado, produtosRaw, categoriasRaw] = await Promise.all([
    montarEstadoEditorConteudo(pagina),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.categoriaProduto.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, categoriaMae: { select: { nome: true } } },
    }),
  ]);

  return (
    <ConteudoPaginaEditorClient
      pagina={{
        id: pagina.id,
        titulo: pagina.titulo,
        slug: pagina.slug,
        tipo: pagina.tipo,
        statusPublicacao: pagina.statusPublicacao,
        publicPath: rotaPublicaConteudoPagina(pagina),
      }}
      estado={estado}
      produtos={produtosRaw.map((produto) => ({ id: produto.id, label: produto.nome }))}
      categorias={categoriasRaw.map((categoria) => ({
        id: categoria.id,
        label: categoria.categoriaMae ? `${categoria.categoriaMae.nome} · ${categoria.nome}` : categoria.nome,
      }))}
      canEdit={usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar")}
      canCreateMedia={usuarioTemPermissaoAdmin(usuario, "lojaOnline", "criar")}
      canPublish={usuarioTemPermissaoAdmin(usuario, "lojaOnline", "executar")}
    />
  );
}
