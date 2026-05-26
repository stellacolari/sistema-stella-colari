import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FolderTree,
  FormInput,
  Home,
  ImageIcon,
  LayoutTemplate,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Editor do site | Sistema Stella",
};

const editorCards = [
  {
    title: "Páginas / Builder",
    description:
      "Crie páginas gerais, landing pages, campanhas, categorias e templates por blocos.",
    href: "/configuracoes/loja/paginas",
    icon: FileText,
    highlight: true,
  },
  {
    title: "Template de categoria",
    description:
      "Gerencie o template padrão usado automaticamente pelas páginas de categoria.",
    href: "/configuracoes/loja/paginas",
    icon: LayoutTemplate,
    highlight: false,
  },
  {
    title: "Categorias",
    description:
      "Organize categorias, subcategorias, imagens, ordem e exibição no menu público.",
    href: "/configuracoes/loja/categorias",
    icon: FolderTree,
    highlight: false,
  },
  {
    title: "Formulários",
    description:
      "Veja leads, contatos, orçamentos e respostas recebidas pelos formulários do builder.",
    href: "/configuracoes/loja/formularios",
    icon: FormInput,
    highlight: false,
  },
  {
    title: "Banners e menu",
    description:
      "Configure banners, menus públicos, destaques e links principais da loja.",
    href: "/configuracoes/loja",
    icon: Menu,
    highlight: false,
  },
  {
    title: "Home atual",
    description:
      "Acesse as configurações atuais da home enquanto migramos tudo para o builder.",
    href: "/configuracoes/loja/home",
    icon: Home,
    highlight: false,
  },
];

const quickActions = [
  {
    title: "Ver loja pública",
    href: "/loja",
    icon: ExternalLink,
  },
  {
    title: "Voltar para gestão",
    href: "/",
    icon: ArrowLeft,
  },
];

export default function SiteEditorPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Sistema Stella
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Editor do site
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Área focada em conteúdo, páginas, categorias, formulários, banners
              e configurações visuais da loja pública.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4" />
                  {action.title}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Gestão separada do site
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A operação diária continua na gestão principal. Aqui ficam as
                  ferramentas de edição da loja: páginas, templates, banners,
                  categorias visuais e captação de contatos.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Settings className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Próxima evolução
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Depois vamos transformar o builder em um editor ainda mais
                  visual, com painel de blocos, prévia, rascunho, publicação e
                  histórico de versões.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {editorCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  card.highlight
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-950"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    card.highlight
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>

                <p
                  className={`mt-2 text-sm leading-6 ${
                    card.highlight ? "text-white/75" : "text-slate-600"
                  }`}
                >
                  {card.description}
                </p>

                <div
                  className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${
                    card.highlight ? "text-white" : "text-slate-950"
                  }`}
                >
                  Abrir
                  <ExternalLink className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Atalhos úteis
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Acesso rápido às áreas públicas e de apoio.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/loja"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" />
                Ver loja
              </Link>

              <Link
                href="/configuracoes/loja/paginas"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ImageIcon className="h-4 w-4" />
                Abrir builder
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}