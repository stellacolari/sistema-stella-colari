import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  ClipboardList,
  Eye,
  FolderKanban,
  Home,
  LayoutTemplate,
  Megaphone,
  PackageCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

export const metadata: Metadata = {
  title: "Loja Online | Sistema Stella",
};

export const dynamic = "force-dynamic";

type CentralCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ElementType;
  metric?: string;
  metricLabel?: string;
  tone?: "default" | "site" | "warning" | "success";
  external?: boolean;
};

function cardToneClass(tone: CentralCardProps["tone"]) {
  if (tone === "site") {
    return "border-indigo-100 bg-indigo-50/40 hover:border-indigo-200";
  }

  if (tone === "warning") {
    return "border-amber-100 bg-amber-50/50 hover:border-amber-200";
  }

  if (tone === "success") {
    return "border-emerald-100 bg-emerald-50/50 hover:border-emerald-200";
  }

  return "border-slate-200 bg-white hover:border-slate-300";
}

function iconToneClass(tone: CentralCardProps["tone"]) {
  if (tone === "site") {
    return "bg-indigo-100 text-indigo-700";
  }

  if (tone === "warning") {
    return "bg-amber-100 text-amber-700";
  }

  if (tone === "success") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function CentralCard({
  href,
  title,
  description,
  icon: Icon,
  metric,
  metricLabel,
  tone = "default",
  external = false,
}: CentralCardProps) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`group flex h-full flex-col justify-between rounded-3xl border p-5 shadow-sm transition ${cardToneClass(
        tone
      )}`}
    >
      <div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconToneClass(
            tone
          )}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-base font-bold text-slate-950">{title}</h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {(metric || metricLabel) && (
        <div className="mt-5 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200">
          {metric && (
            <p className="text-2xl font-bold tracking-tight text-slate-950">
              {metric}
            </p>
          )}

          {metricLabel && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {metricLabel}
            </p>
          )}
        </div>
      )}

      <p className="mt-5 text-sm font-semibold text-slate-700 transition group-hover:text-slate-950">
        Abrir módulo →
      </p>
    </Link>
  );
}

export default async function LojaOnlineCentralPage() {
  const [
    bannersAtivos,
    menusAtivos,
    categoriasTotal,
    categoriasSemImagem,
    paginasPublicadas,
    paginasNaoPublicadas,
    formulariosNovos,
    cuponsAtivos,
    cashbackConfig,
    freteConfig,
    produtosAtivos,
    produtosSemEstoque,
    modelosEmbalagem,
  ] = await Promise.all([
    prisma.bannerLoja.count({
      where: {
        ativo: true,
      },
    }),

    prisma.menuLoja.count({
      where: {
        ativo: true,
      },
    }),

    prisma.categoriaProduto.count({
      where: {
        ativo: true,
      },
    }),

    prisma.categoriaProduto.count({
      where: {
        ativo: true,
        OR: [{ imagemUrl: null }, { imagemUrl: "" }],
      },
    }),

    prisma.lojaPagina.count({
      where: {
        ativo: true,
        statusPublicacao: "PUBLICADA",
      },
    }),

    prisma.lojaPagina.count({
      where: {
        OR: [{ ativo: false }, { statusPublicacao: { not: "PUBLICADA" } }],
      },
    }),

    prisma.lojaFormularioResposta.count({
      where: {
        status: "NOVO",
      },
    }),

    prisma.cupomLoja.count({
      where: {
        ativo: true,
      },
    }),

    prisma.lojaCashbackConfiguracao.findUnique({
      where: {
        chave: "PADRAO",
      },
      select: {
        ativo: true,
        percentualPrimeiraCompra: true,
        percentualCompraRecorrente: true,
      },
    }),

    buscarConfiguracaoFrete(),

    prisma.produto.count({
      where: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
    }),

    prisma.produto.count({
      where: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
        estoque: {
          every: {
            quantidadeAtual: {
              lte: 0,
            },
          },
        },
      },
    }),

    prisma.embalagemModelo.count({
      where: {
        ativo: true,
      },
    }),
  ]);

  const cashbackTexto = cashbackConfig?.ativo
    ? `${Number(cashbackConfig.percentualPrimeiraCompra || 0)}% / ${Number(
        cashbackConfig.percentualCompraRecorrente || 0
      )}%`
    : "Inativo";
  const freteTexto =
    freteConfig.provedor === "DESATIVADO"
      ? "Desativado"
      : freteConfig.retiradaLocalHabilitada
      ? `${freteConfig.provedor} + retirada`
      : freteConfig.provedor;

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Configurações da loja
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Central da Loja Online
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gerencie a vitrine, navegação, páginas, categorias, campanhas,
              cupons, cashback e leads da loja pública em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/loja"
              target="_blank"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver loja pública
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Produtos ativos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {produtosAtivos}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {produtosSemEstoque} sem estoque
          </p>
        </div>

        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Páginas
          </p>

          <p className="mt-2 text-3xl font-bold text-indigo-950">
            {paginasPublicadas}
          </p>

          <p className="mt-1 text-xs text-indigo-700">
            {paginasNaoPublicadas} rascunho/inativas
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Categorias
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-950">
            {categoriasTotal}
          </p>

          <p className="mt-1 text-xs text-amber-700">
            {categoriasSemImagem} sem imagem
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Leads novos
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {formulariosNovos}
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            respostas de formulários
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CentralCard
          href="/configuracoes/loja/banners-menu"
          title="Banners e menu"
          description="Configure banners desktop/mobile, links do menu público, destaques e navegação da loja."
          icon={SlidersHorizontal}
          metric={`${bannersAtivos} / ${menusAtivos}`}
          metricLabel="banners ativos / links ativos"
          tone="site"
        />

        <CentralCard
          href="/configuracoes/loja/home"
          title="Home da loja"
          description="Organize categorias em destaque, seções de produtos, blocos promocionais e textos institucionais."
          icon={Home}
          metric="Vitrine"
          metricLabel="estrutura da home"
          tone="site"
        />

        <CentralCard
          href="/configuracoes/loja/paginas"
          title="Páginas / Builder"
          description="Crie páginas gerais, páginas de categoria, landing pages, campanhas e templates."
          icon={LayoutTemplate}
          metric={`${paginasPublicadas}`}
          metricLabel="páginas publicadas"
          tone="site"
        />

        <CentralCard
          href="/configuracoes/loja/categorias"
          title="Categorias"
          description="Gerencie categorias, subcategorias, imagens, descrições, ordem e exibição no menu."
          icon={FolderKanban}
          metric={`${categoriasTotal}`}
          metricLabel="categorias ativas"
          tone={categoriasSemImagem > 0 ? "warning" : "default"}
        />

        <CentralCard
          href="/configuracoes/loja/cupons"
          title="Cupons"
          description="Configure campanhas comerciais, códigos promocionais, limites e validade."
          icon={Tag}
          metric={`${cuponsAtivos}`}
          metricLabel="cupons ativos"
          tone="success"
        />

        <CentralCard
          href="/configuracoes/loja/cashback"
          title="Cashback"
          description="Defina percentuais, regras de uso e bloqueios relacionados a cupons e promoções."
          icon={Sparkles}
          metric={cashbackTexto}
          metricLabel="primeira / recorrente"
          tone="success"
        />

        <CentralCard
          href="/configuracoes/loja/frete"
          title="Frete e entrega"
          description="Configure Melhor Envio, origem, dimensões fallback, ajustes de prazo/valor e retirada local."
          icon={PackageCheck}
          metric={freteTexto}
          metricLabel="provedor ativo"
          tone={freteConfig.provedor === "DESATIVADO" ? "warning" : "site"}
        />

        <CentralCard
          href="/configuracoes/loja/embalagens"
          title="Embalagens da loja"
          description="Modele classes, caixas, embalagem de presente, componentes consumidos e compatibilidades."
          icon={Boxes}
          metric={`${modelosEmbalagem}`}
          metricLabel="modelos ativos"
          tone="site"
        />

        <CentralCard
          href="/configuracoes/loja/formularios"
          title="Leads / Formulários"
          description="Acompanhe respostas recebidas em páginas, campanhas, CTAs e formulários do builder."
          icon={ClipboardList}
          metric={`${formulariosNovos}`}
          metricLabel="novos leads"
          tone={formulariosNovos > 0 ? "warning" : "default"}
        />

        <CentralCard
          href="/produtos"
          title="Produtos da loja"
          description="Revise produtos ativos, imagens, estoque, famílias, variações e disponibilidade na loja."
          icon={Megaphone}
          metric={`${produtosAtivos}`}
          metricLabel="produtos publicados"
        />

        <CentralCard
          href="/loja"
          title="Ver loja pública"
          description="Abra a loja como cliente para revisar visual, navegação, banners, produtos e páginas."
          icon={Eye}
          metric="Preview"
          metricLabel="abrir em nova aba"
          tone="site"
          external
        />
      </section>
    </main>
  );
}
