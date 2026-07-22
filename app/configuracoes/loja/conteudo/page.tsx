import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  GalleryVerticalEnd,
  Megaphone,
} from "lucide-react";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conteúdo da Loja | Plataforma Stella Colari",
};

export default async function ConteudoLojaPage() {
  await exigirAdminComPermissao("lojaOnline", "ver");
  const agora = new Date();

  const [paginas, documentos, campanhas, midiasSemAlt, ultimaPublicacao] = await Promise.all([
    prisma.lojaPagina.count({ where: { statusPublicacao: { not: "ARQUIVADA" } } }),
    prisma.lojaConteudoDocumento.groupBy({ by: ["status", "modoEntrega"], _count: true }),
    prisma.lojaConteudoDocumento.count({
      where: {
        tipo: "CAMPANHA",
        modoEntrega: "NOVO",
        status: { in: ["PUBLICADA", "AGENDADA"] },
        OR: [{ fimPublicacao: null }, { fimPublicacao: { gt: agora } }],
      },
    }),
    prisma.midiaAsset.count({ where: { status: "ATIVO", tipo: "IMAGEM", OR: [{ alt: null }, { alt: "" }] } }),
    prisma.lojaConteudoVersao.findFirst({
      where: { operacao: "PUBLICACAO" },
      orderBy: { criadoEm: "desc" },
      select: { criadoEm: true, documento: { select: { chave: true } } },
    }),
  ]);

  const novos = documentos.filter((item) => item.modoEntrega === "NOVO").reduce((sum, item) => sum + item._count, 0);
  const rascunhos = documentos.filter((item) => item.status === "RASCUNHO").reduce((sum, item) => sum + item._count, 0);

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <ConteudoLojaNav
        title="Visão geral"
        description="Mantenha textos, imagens, seleções e campanhas das experiências que já são construídas em código."
        actions={
          <Link
            href="/loja"
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver loja pública
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <section className="grid border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Páginas", value: paginas, helper: "experiências cadastradas", icon: FileText },
            { label: "Experiência nova", value: novos, helper: "documentos ativados", icon: CheckCircle2 },
            { label: "Rascunhos", value: rascunhos, helper: "aguardando publicação", icon: Clock3 },
            { label: "Imagens sem alt", value: midiasSemAlt, helper: "pendência de acessibilidade", icon: GalleryVerticalEnd },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`p-5 sm:p-6 ${index > 0 ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{item.label}</p>
                  <Icon className="h-4 w-4 text-[#4772AA]" />
                </div>
                <p className="mt-4 text-4xl font-light tracking-[-0.04em] text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
              </div>
            );
          })}
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-slate-950">Atalhos editoriais</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {[
                { href: "/configuracoes/loja/conteudo/paginas", title: "Páginas", text: "Editar Home, Novidades, Presentes e páginas institucionais.", icon: FileText },
                { href: "/configuracoes/loja/conteudo/campanhas", title: "Campanhas", text: "Preparar landings, seleções e janelas de exibição sem alterar preço.", icon: Megaphone },
                { href: "/configuracoes/loja/midias", title: "Mídia", text: "Organizar originais, alt, dimensões e usos das imagens.", icon: GalleryVerticalEnd },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="group flex items-center gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0f8] text-[#4772AA]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-500">{item.text}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#4772AA]" />
                  </Link>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4772AA]">Última publicação</p>
              {ultimaPublicacao ? (
                <>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{ultimaPublicacao.documento.chave}</p>
                  <p className="mt-1 text-sm text-slate-500">{ultimaPublicacao.criadoEm.toLocaleString("pt-BR")}</p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">A primeira publicação pelo novo gerenciador ainda não foi feita.</p>
              )}
            </section>
            <section className="rounded-2xl border border-[#5D8CC8]/35 bg-[#eaf0f8] p-5 text-[#274b78]">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Transição sem perda</p>
                  <p className="mt-1 text-sm leading-6">
                    Páginas continuam no renderer legado até o conteúdo novo ser revisado e publicado individualmente.
                  </p>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Campanhas ativas ou agendadas</p>
              <p className="mt-3 text-3xl font-light text-slate-950">{campanhas}</p>
              <p className="mt-1 text-xs text-slate-500">Conteúdo editorial, sem efeito automático em descontos.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
