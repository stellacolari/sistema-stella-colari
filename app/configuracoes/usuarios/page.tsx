import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  perfilAdministrativoResumoSelect,
  usuarioAdminSeguroSelect,
  type UsuarioAdminSeguro,
} from "@/lib/admin/usuarios-admin";
import UsuariosAdminClient from "@/components/configuracoes/UsuariosAdminClient";

export const metadata: Metadata = {
  title: "Usuarios Administrativos | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

function serializarUsuario(usuario: UsuarioAdminSeguro) {
  return {
    ...usuario,
    ultimoLoginEm: usuario.ultimoLoginEm?.toISOString() || null,
    criadoEm: usuario.criadoEm.toISOString(),
    atualizadoEm: usuario.atualizadoEm.toISOString(),
  };
}

export default async function UsuariosAdminPage() {
  const usuarioAtual = await exigirAdmin();

  if (usuarioAtual.perfil !== "ACESSO_GERAL") {
    redirect("/notificacoes");
  }

  const [usuarios, perfis] = await Promise.all([
    prisma.usuarioAdmin.findMany({
      select: usuarioAdminSeguroSelect,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    prisma.perfilAdministrativo.findMany({
      select: perfilAdministrativoResumoSelect,
      orderBy: [{ ativo: "desc" }, { tipoBase: "asc" }, { nome: "asc" }],
    }),
  ]);

  return (
    <UsuariosAdminClient
      usuariosIniciais={usuarios.map(serializarUsuario)}
      perfis={perfis}
      usuarioAtualId={usuarioAtual.id}
    />
  );
}
