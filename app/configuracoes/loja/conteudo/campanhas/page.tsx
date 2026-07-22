import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CampanhasConteudoClient from "@/components/configuracoes/loja/conteudo/CampanhasConteudoClient";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";
import {
  exigirAdminComPermissao,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Campanhas | Conteúdo da Loja" };

function statusEfetivoCampanha(
  document: {
    status: string;
    modoEntrega: string;
    inicioPublicacao: Date | null;
    fimPublicacao: Date | null;
  } | null,
  fallback: string,
) {
  if (!document || document.modoEntrega !== "NOVO") return fallback;
  if (!["PUBLICADA", "AGENDADA"].includes(document.status)) return document.status;
  const agora = new Date();
  if (document.fimPublicacao && document.fimPublicacao <= agora) return "ENCERRADA";
  if (document.inicioPublicacao && document.inicioPublicacao > agora) return "AGENDADA";
  return "ATIVA";
}

export default async function ConteudoCampanhasPage() {
  const usuario = await exigirAdminComPermissao("lojaOnline", "ver");
  const canEdit = usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar");
  const campaigns = await prisma.lojaPagina.findMany({
    where: { tipo: "CAMPANHA" },
    orderBy: { atualizadoEm: "desc" },
    select: {
      id: true,
      titulo: true,
      slug: true,
      statusPublicacao: true,
      atualizadoEm: true,
      conteudoDocumento: {
        select: {
          status: true,
          modoEntrega: true,
          inicioPublicacao: true,
          fimPublicacao: true,
          prioridade: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <ConteudoLojaNav
        title="Campanhas"
        description="Crie experiências editoriais com janela de exibição e seleções de produtos. Nenhuma campanha altera preços automaticamente."
        actions={<CampanhasConteudoClient canCreate={usuarioTemPermissaoAdmin(usuario, "lojaOnline", "criar")} />}
      />
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {campaigns.length ? (
            <div className="divide-y divide-slate-200">
              {campaigns.map((campaign) => {
                const document = campaign.conteudoDocumento;
                const status = statusEfetivoCampanha(document, campaign.statusPublicacao);
                return (
                  <article key={campaign.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_150px_180px_auto] md:items-center sm:px-6">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950">{campaign.titulo}</h2>
                      <p className="mt-1 text-sm text-slate-500">/loja/p/{campaign.slug}</p>
                    </div>
                    <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{status}</span>
                    <div className="text-xs leading-5 text-slate-500">
                      {document?.inicioPublicacao ? <p>Início: {document.inicioPublicacao.toLocaleString("pt-BR")}</p> : <p>Sem agendamento</p>}
                      {document?.fimPublicacao ? <p>Fim: {document.fimPublicacao.toLocaleString("pt-BR")}</p> : null}
                    </div>
                    <Link href={`/configuracoes/loja/conteudo/paginas/${campaign.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]">
                      {canEdit ? "Editar" : "Visualizar"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-slate-900">Nenhuma campanha cadastrada.</p>
              <p className="mt-2 text-sm text-slate-500">Crie um rascunho para começar.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
