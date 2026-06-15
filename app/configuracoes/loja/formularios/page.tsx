import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import FormulariosRespostasClient, {
  type FormularioRespostaItem,
} from "@/components/configuracoes/loja/FormulariosRespostasClient";

export const metadata: Metadata = {
  title: "Respostas de formulários | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function FormulariosPage() {
  const respostasRaw = await prisma.lojaFormularioResposta.findMany({
    orderBy: {
      criadoEm: "desc",
    },
  });

  const respostas: FormularioRespostaItem[] = respostasRaw.map((resposta) => ({
    id: resposta.id,
    paginaId: resposta.paginaId,
    paginaTitulo: resposta.paginaTitulo,
    paginaSlug: resposta.paginaSlug,
    paginaTipo: resposta.paginaTipo,
    blocoId: resposta.blocoId,
    blocoTipo: resposta.blocoTipo,
    blocoTitulo: resposta.blocoTitulo,
    nome: resposta.nome,
    telefone: resposta.telefone,
    email: resposta.email,
    cidade: resposta.cidade,
    mensagem: resposta.mensagem,
    aceiteTermos: resposta.aceiteTermos,
    aceitaMarketing: resposta.aceitaMarketing,
    status: resposta.status,
    origemUrl: resposta.origemUrl,
    observacaoInterna: resposta.observacaoInterna,
    criadoEm: resposta.criadoEm.toISOString(),
    atualizadoEm: resposta.atualizadoEm.toISOString(),
  }));

  return (
    <main className="space-y-6">
      <LojaConfigHeader
        title="Formulários"
        description="Acompanhe respostas e contatos recebidos pela loja online."
      />

      <FormulariosRespostasClient respostas={respostas} />
    </main>
  );
}
