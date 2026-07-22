import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdminComPermissao } from "@/lib/auth/admin";

export default async function HomeConteudoRedirect() {
  await exigirAdminComPermissao("lojaOnline", "ver");
  const home = await prisma.lojaPagina.findUnique({ where: { slug: "home" }, select: { id: true } });
  redirect(home ? `/configuracoes/loja/conteudo/paginas/${home.id}` : "/configuracoes/loja/conteudo/paginas");
}
