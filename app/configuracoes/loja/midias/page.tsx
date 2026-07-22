import type { Metadata } from "next";
import {
  exigirAdminComPermissao,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import MidiaBibliotecaClient from "@/components/configuracoes/loja/MidiaBibliotecaClient";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";

export const metadata: Metadata = {
  title: "Mídia | Conteúdo da Loja | Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function BibliotecaMidiaPage() {
  const usuario = await exigirAdminComPermissao("lojaOnline", "ver");
  const capacidades = {
    criar: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "criar"),
    editar: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar"),
    arquivar:
      usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar") &&
      usuarioTemPermissaoAdmin(usuario, "lojaOnline", "excluir"),
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <ConteudoLojaNav
        title="Mídia"
        description="Preserve os arquivos originais, organize o acervo e acompanhe onde cada imagem é utilizada. O enquadramento é salvo por uso, separadamente para desktop e mobile."
      />
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <MidiaBibliotecaClient capacidades={capacidades} />
      </div>
    </main>
  );
}
