import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import {
  buscarPaginaConteudoBase,
  montarEstadoEditorConteudo,
} from "@/lib/loja/conteudo/repository.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SEO | Conteúdo da Loja" };

export default async function ConteudoSeoPage() {
  await exigirAdminComPermissao("lojaOnline", "ver");
  const ids = await prisma.lojaPagina.findMany({
    where: { statusPublicacao: { not: "ARQUIVADA" } },
    orderBy: { titulo: "asc" },
    select: { id: true },
  });
  const pages = (await Promise.all(ids.map((item) => buscarPaginaConteudoBase(item.id)))).filter(Boolean);
  const states = await Promise.all(pages.map((page) => montarEstadoEditorConteudo(page!)));

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <ConteudoLojaNav
        title="SEO"
        description="Revise títulos, descrições e imagens de compartilhamento sem expor rascunhos aos buscadores."
      />
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-200">
            {pages.map((page, index) => {
              if (!page) return null;
              const values = states[index].conteudo.values;
              const title = typeof values["seo.title"] === "string" ? values["seo.title"] : page.seoTitle || "";
              const description = typeof values["seo.description"] === "string" ? values["seo.description"] : page.seoDescription || "";
              const complete = Boolean(title && description);
              return (
                <article key={page.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-center sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}
                      <h2 className="text-sm font-semibold text-slate-950">{page.titulo}</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{complete ? "SEO principal preenchido" : "Título ou descrição pendente"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#274b78]">{title || "Título não definido"}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{description || "Descrição não definida"}</p>
                  </div>
                  <Link href={`/configuracoes/loja/conteudo/paginas/${page.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Revisar <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
