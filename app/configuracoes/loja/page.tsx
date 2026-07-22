import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Eye,
  FolderKanban,
  GalleryVerticalEnd,
  LayoutTemplate,
  Menu,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

export const metadata: Metadata = {
  title: "Loja Online | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type CentralAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type CentralCardProps = {
  title: string;
  description: string;
  icon: ElementType;
  actions: CentralAction[];
  metric?: string;
  metricLabel?: string;
  tone?: "default" | "site" | "warning" | "success";
};

type MetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
  tone?: "default" | "site" | "warning" | "success";
};

function cardToneClass(tone: CentralCardProps["tone"]) {
  if (tone === "site") {
    return "border-indigo-100 bg-indigo-50/40";
  }

  if (tone === "warning") {
    return "border-amber-100 bg-amber-50/50";
  }

  if (tone === "success") {
    return "border-emerald-100 bg-emerald-50/50";
  }

  return "border-slate-200 bg-white";
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

function MetricCard({ label, value, helper, tone = "default" }: MetricCardProps) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${cardToneClass(tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function CentralCard({
  title,
  description,
  icon: Icon,
  actions,
  metric,
  metricLabel,
  tone = "default",
}: CentralCardProps) {
  return (
    <article
      className={`flex h-full flex-col justify-between rounded-3xl border p-5 shadow-sm ${cardToneClass(
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
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              action.primary
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </article>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="md:col-span-2 xl:col-span-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function LojaOnlineCentralPage() {
  const usuario = await exigirAdmin();
  const podeVerVitrinesInteligentes = usuario.perfil === "ACESSO_GERAL";
  const [
    menusAtivos,
    categoriasTotal,
    categoriasSemImagem,
    paginasPublicadas,
    paginasNaoPublicadas,
    paginasCategoria,
    midiasAtivas,
    formulariosNovos,
    cuponsAtivos,
    cashbackConfig,
    freteConfig,
    modelosEmbalagem,
    vitrinesSugeridas,
    colecoesInteligentes,
  ] = await Promise.all([
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

    prisma.lojaPagina.count({
      where: {
        tipo: "CATEGORIA",
        statusPublicacao: {
          not: "ARQUIVADA",
        },
      },
    }),

    prisma.midiaAsset.count({
      where: {
        status: "ATIVO",
        tipo: "IMAGEM",
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

    prisma.embalagemModelo.count({
      where: {
        ativo: true,
      },
    }),

    prisma.vitrineInteligenteSugestao.count({
      where: {
        status: {
          in: ["SUGERIDA", "EM_REVISAO"],
        },
      },
    }),

    prisma.colecaoInteligente.count({
      where: {
        status: {
          in: ["RASCUNHO", "ATIVA"],
        },
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
              Loja Online
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Loja Online
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configure aparência, páginas, categorias, promoções, frete,
              formulários e recursos da loja pública.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/loja"
              target="_blank"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
              Ver loja pública
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Páginas"
          value={paginasPublicadas}
          helper={`${paginasNaoPublicadas} rascunho/inativas · ${paginasCategoria} de categoria`}
          tone="site"
        />

        <MetricCard
          label="Categorias"
          value={categoriasTotal}
          helper={`${categoriasSemImagem} sem imagem`}
          tone={categoriasSemImagem > 0 ? "warning" : "default"}
        />

        <MetricCard
          label="Promoções"
          value={cuponsAtivos}
          helper={`cupons ativos, cashback ${cashbackTexto.toLowerCase()}`}
          tone="success"
        />

        <MetricCard
          label="Leads novos"
          value={formulariosNovos}
          helper="respostas de formulários"
          tone={formulariosNovos > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Home dentro de Páginas"
          description="A página inicial usa uma experiência codificada e seus textos, imagens e seleções ficam no Conteúdo da Loja."
        />
        <InfoCard
          title="Banners são seções de conteúdo"
          description="Banners, imagens e CTAs são mantidos em campos próprios, sem liberdade para alterar o layout da página."
        />
        <InfoCard
          title="Categorias com conteúdo editorial"
          description="Categorias continuam como taxonomia; capa, texto e SEO podem ser mantidos sem alterar a grade dinâmica."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionHeader
          title="Conteúdo e experiências"
          description="Páginas codificadas com conteúdo editorial administrável."
        />
        <CentralCard
          title="Conteúdo da Loja"
          description="Edite Home, páginas institucionais, categorias e campanhas por formulários seguros."
          icon={LayoutTemplate}
          metric={`${paginasPublicadas}`}
          metricLabel={`${paginasCategoria} páginas de categoria`}
          tone="site"
          actions={[
            {
              href: "/configuracoes/loja/conteudo",
              label: "Gerenciar páginas",
              primary: true,
            },
          ]}
        />

        <CentralCard
          title="Biblioteca de Midia"
          description="Organize imagens originais reutilizáveis, alt, dimensões, crop e metadados."
          icon={GalleryVerticalEnd}
          metric={`${midiasAtivas}`}
          metricLabel="imagens ativas"
          tone="site"
          actions={[
            {
              href: "/configuracoes/loja/midias",
              label: "Abrir biblioteca",
              primary: true,
            },
          ]}
        />

        <SectionHeader
          title="Inteligencia comercial"
          description="Vitrines e colecoes que ajudam a montar exposicao de produtos."
        />

        {podeVerVitrinesInteligentes ? (
          <CentralCard
            title="Vitrines Inteligentes"
            description="Sugestões internas de vitrines para revisão antes do uso no conteúdo da loja."
            icon={GalleryVerticalEnd}
            metric={`${vitrinesSugeridas}`}
            metricLabel="sugestões abertas"
            tone="site"
            actions={[
              {
                href: "/configuracoes/loja/vitrines-inteligentes",
                label: "Ver vitrines",
                primary: true,
              },
            ]}
          />
        ) : null}

        {podeVerVitrinesInteligentes ? (
          <CentralCard
            title="Colecoes Inteligentes"
            description="Crie e aprove grupos inteligentes de produtos para usar nas experiências da loja."
            icon={Sparkles}
            metric={`${colecoesInteligentes}`}
            metricLabel="colecoes abertas"
            tone="site"
            actions={[
              {
                href: "/configuracoes/loja/colecoes-inteligentes",
                label: "Ver colecoes",
                primary: true,
              },
            ]}
          />
        ) : null}

        <SectionHeader
          title="Navegacao e catalogo"
          description="Menu, rodape e categorias que orientam a descoberta na loja."
        />

        <CentralCard
          title="Menu e Rodapé"
          description="Configure navegação global, links, categorias do menu e referências usadas no rodapé."
          icon={Menu}
          metric={`${menusAtivos}`}
          metricLabel="links ativos no menu"
          actions={[
            {
              href: "/configuracoes/loja/menu-rodape",
              label: "Editar menu e rodapé",
              primary: true,
            },
          ]}
        />

        <CentralCard
          title="Categorias"
          description="Gerencie taxonomia, hierarquia e conteúdo editorial vinculado às categorias."
          icon={FolderKanban}
          metric={`${categoriasTotal}`}
          metricLabel="categorias ativas"
          tone={categoriasSemImagem > 0 ? "warning" : "default"}
          actions={[
            {
              href: "/configuracoes/loja/categorias",
              label: "Gerenciar categorias",
              primary: true,
            },
          ]}
        />

        <SectionHeader
          title="Promocoes"
          description="Cupons e cashback da loja online."
        />

        <CentralCard
          title="Promoções"
          description="Configure cupons e cashback."
          icon={Sparkles}
          metric={`${cuponsAtivos} / ${cashbackTexto}`}
          metricLabel="cupons ativos / cashback"
          tone="success"
          actions={[
            {
              href: "/configuracoes/loja/cupons",
              label: "Cupons",
              primary: true,
            },
            {
              href: "/configuracoes/loja/cashback",
              label: "Cashback",
            },
          ]}
        />

        <SectionHeader
          title="Configuracoes"
          description="Frete, formularios e embalagens usadas pela operacao da loja."
        />

        <CentralCard
          title="Frete"
          description="Configure origem, remetente, retirada e integrações de frete."
          icon={PackageCheck}
          metric={freteTexto}
          metricLabel="provedor ativo"
          tone={freteConfig.provedor === "DESATIVADO" ? "warning" : "site"}
          actions={[
            {
              href: "/configuracoes/loja/frete",
              label: "Configurar frete",
              primary: true,
            },
          ]}
        />

        <CentralCard
          title="Formulários"
          description="Acompanhe respostas e contatos recebidos pela loja."
          icon={ClipboardList}
          metric={`${formulariosNovos}`}
          metricLabel="novos leads"
          tone={formulariosNovos > 0 ? "warning" : "default"}
          actions={[
            {
              href: "/configuracoes/loja/formularios",
              label: "Ver formulários",
              primary: true,
            },
          ]}
        />

        <CentralCard
          title="Embalagens"
          description="Configure embalagens padrão, presente e componentes."
          icon={Boxes}
          metric={`${modelosEmbalagem}`}
          metricLabel="modelos ativos"
          tone="site"
          actions={[
            {
              href: "/configuracoes/loja/embalagens",
              label: "Configurar embalagens",
              primary: true,
            },
          ]}
        />
      </section>
    </main>
  );
}
