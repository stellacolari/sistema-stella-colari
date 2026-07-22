import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Eye, History } from "lucide-react";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";
import { exigirAdminComPermissao, usuarioTemPermissaoAdmin } from "@/lib/auth/admin";
import {
  rotaPublicaConteudoPagina,
  rotuloRotaConteudoPagina,
} from "@/lib/loja/conteudo/public-route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Páginas | Conteúdo da Loja",
};

export default async function ConteudoPaginasPage() {
  const usuario = await exigirAdminComPermissao("lojaOnline", "ver");
  const canEdit = usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar");
  const pages = await prisma.lojaPagina.findMany({
    where: { tipo: { not: "CAMPANHA" } },
    orderBy: [{ tipo: "asc" }, { atualizadoEm: "desc" }],
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      ativo: true,
      statusPublicacao: true,
      atualizadoEm: true,
      publicadoEm: true,
      categoria: { select: { slug: true } },
      conteudoDocumento: {
        select: { status: true, modoEntrega: true, revisaoRascunho: true, atualizadoEm: true, publicadoEm: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <ConteudoLojaNav
        title="Páginas"
        description="Cada página possui uma experiência fixa em código e apenas os campos de conteúdo necessários."
      />
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_150px_180px_250px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>Página</span><span>Rota</span><span>Status</span><span>Última edição</span><span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-slate-200">
            {pages.map((page) => {
              const path = rotaPublicaConteudoPagina(page);
              const pathLabel = rotuloRotaConteudoPagina(page);
              const document = page.conteudoDocumento;
              const status = document?.modoEntrega === "NOVO"
                ? document.status
                : page.statusPublicacao === "PUBLICADA" ? "PUBLICADA · LEGADO" : page.statusPublicacao;
              const updatedAt = document?.atualizadoEm || page.atualizadoEm;
              return (
                <article key={page.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(180px,1.4fr)_minmax(180px,1fr)_150px_180px_250px] lg:items-center">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">{page.titulo}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{page.tipo.replaceAll("_", " ")}</p>
                  </div>
                  <p className="break-all text-sm text-slate-600">{pathLabel}</p>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    status.startsWith("PUBLICADA")
                      ? document?.modoEntrega === "NOVO" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}>{status}</span>
                  <p className="text-sm text-slate-500">{updatedAt.toLocaleString("pt-BR")}</p>
                  <div className="flex items-center justify-start gap-2 lg:justify-end">
                    {path && page.ativo ? (
                      <Link href={path} target="_blank" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`Abrir ${page.titulo} na loja pública`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : null}
                    <Link href={`/loja/preview/pagina/${page.id}?conteudo=1`} target="_blank" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`Abrir prévia de ${page.titulo}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/configuracoes/loja/conteudo/historico?pagina=${page.id}`} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`Ver histórico de ${page.titulo}`}>
                      <History className="h-4 w-4" />
                    </Link>
                    <Link href={`/configuracoes/loja/conteudo/paginas/${page.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4772AA] px-4 text-sm font-semibold text-white transition hover:bg-[#3f6699]">
                      {canEdit ? "Editar" : "Visualizar"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
