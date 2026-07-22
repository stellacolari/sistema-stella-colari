import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Histórico | Conteúdo da Loja" };

export default async function ConteudoHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await exigirAdminComPermissao("lojaOnline", "ver");
  const { pagina } = await searchParams;
  const versions = await prisma.lojaConteudoVersao.findMany({
    where: pagina ? { documento: { paginaId: pagina } } : undefined,
    orderBy: { criadoEm: "desc" },
    take: 100,
    select: {
      id: true,
      numero: true,
      operacao: true,
      resumo: true,
      autorNome: true,
      criadoEm: true,
      documento: {
        select: {
          paginaId: true,
          chave: true,
          versaoPublicadaId: true,
          pagina: { select: { titulo: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <ConteudoLojaNav
        title="Histórico"
        description="Versões imutáveis de rascunho, publicação, migração e restauração. Restaurar sempre cria um novo rascunho."
      />
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {versions.length ? (
            <ol className="divide-y divide-slate-200">
              {versions.map((version) => (
                <li key={version.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_170px_220px_auto] md:items-center sm:px-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{version.documento.pagina?.titulo || version.documento.chave}</p>
                    <p className="mt-1 text-xs text-slate-500">Versão {version.numero} · {version.operacao.toLowerCase()}{version.id === version.documento.versaoPublicadaId ? " · publicada" : ""}</p>
                  </div>
                  <p className="text-sm text-slate-600">{version.autorNome || "Sistema"}</p>
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{version.criadoEm.toLocaleString("pt-BR")}</p>
                  {version.documento.paginaId ? (
                    <Link href={`/configuracoes/loja/conteudo/paginas/${version.documento.paginaId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Abrir <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Nenhuma versão registrada ainda.</div>
          )}
        </section>
      </div>
    </main>
  );
}
