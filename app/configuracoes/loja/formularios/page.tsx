import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FormulariosRespostasClient, {
  type FormularioRespostaItem,
} from "@/components/configuracoes/loja/FormulariosRespostasClient";

export const metadata: Metadata = {
  title: "Respostas de formulários | Sistema Stella",
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
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Configurações da loja
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Respostas de formulários
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe contatos, interesses, orçamentos e leads recebidos pelos
              formulários criados no builder.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/configuracoes/loja/paginas"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para páginas
            </Link>

            <Link
              href="/loja"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver loja
            </Link>
          </div>
        </div>
      </section>

      <FormulariosRespostasClient respostas={respostas} />
    </main>
  );
}