import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import { serializarColecao } from "@/lib/loja/colecoes-inteligentes";
import ColecoesInteligentesClient from "@/components/configuracoes/loja/colecoes-inteligentes/ColecoesInteligentesClient";

export const metadata: Metadata = {
  title: "Colecoes Inteligentes | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function ColecoesInteligentesPage() {
  const usuario = await exigirAdmin();
  if (
    usuario.perfil !== "ACESSO_GERAL" &&
    !usuarioTemPermissao(usuario, "lojaOnline", "ver") &&
    !usuarioTemPermissao(usuario, "configuracoes", "ver")
  ) {
    redirect("/notificacoes");
  }

  const colecoes = await prisma.colecaoInteligente.findMany({
    include: {
      produtos: {
        where: { status: { not: "IGNORADO" } },
        include: {
          produto: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              imagemUrl: true,
              imagemHoverUrl: true,
              categoria: true,
              precoVenda: true,
            },
          },
        },
        orderBy: [{ fixado: "desc" }, { ordem: "asc" }, { score: "desc" }],
      },
    },
    orderBy: [{ status: "asc" }, { tipo: "asc" }],
  });

  return <ColecoesInteligentesClient colecoes={colecoes.map(serializarColecao)} />;
}
