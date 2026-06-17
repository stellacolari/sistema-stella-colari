import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";
import PerfisPermissoesClient from "@/components/configuracoes/PerfisPermissoesClient";

export const metadata: Metadata = {
  title: "Perfis e Permissoes | Plataforma Stella Colari",
};

export default async function PerfisPage() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL" && !usuarioTemPermissao(usuario, "configuracoes", "editar")) {
    redirect("/notificacoes");
  }

  const [perfis, usuarios, regras] = await Promise.all([
    prisma.perfilAdministrativo.findMany({
      include: {
        usuarios: {
          select: { id: true, nome: true, email: true, perfil: true, perfilAdministrativoId: true, ativo: true },
          orderBy: { nome: "asc" },
        },
      },
      orderBy: [{ tipoBase: "asc" }, { nome: "asc" }],
    }),
    prisma.usuarioAdmin.findMany({
      select: { id: true, nome: true, email: true, perfil: true, perfilAdministrativoId: true, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.regraNotificacaoPerfil.findMany({
      orderBy: [{ categoria: "asc" }, { tipoNotificacao: "asc" }],
    }),
  ]);

  return <PerfisPermissoesClient perfis={perfis} usuarios={usuarios} regras={regras} />;
}
