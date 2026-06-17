import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PlugZap, Settings, ShieldCheck, Store, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Configurações | Plataforma Stella Colari",
};

type HubCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ElementType;
  tone?: "default" | "site" | "system";
};

const configuracoes = [
  {
    href: "/configuracoes/loja",
    title: "Loja Online",
    description: "Ajuste vitrine, páginas, categorias, frete, cupons e campanhas.",
    icon: Store,
    tone: "site" as const,
  },
  {
    href: "/configuracoes/integracoes",
    title: "Integrações",
    description: "Gerencie canais conectados, importações e produtos por canal.",
    icon: PlugZap,
    tone: "system" as const,
  },
  {
    href: "/configuracoes/perfis",
    title: "Perfis e Permissoes",
    description: "Configure cargos administrativos, acessos e regras de notificacao.",
    icon: ShieldCheck,
    tone: "system" as const,
  },
  {
    href: "/lixeira",
    title: "Lixeira",
    description: "Consulte itens removidos e restaure cadastros quando necessário.",
    icon: Trash2,
    tone: "system" as const,
  },
];

function cardToneClass(tone: HubCardProps["tone"]) {
  if (tone === "site") {
    return "hover:ring-indigo-200";
  }

  if (tone === "system") {
    return "hover:ring-violet-200";
  }

  return "hover:ring-slate-300";
}

function iconToneClass(tone: HubCardProps["tone"]) {
  if (tone === "site") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (tone === "system") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
}

function HubCard({
  href,
  title,
  description,
  icon: Icon,
  tone = "default",
}: HubCardProps) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${cardToneClass(
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

        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:text-slate-950">
        Abrir configuração
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function ConfiguracoesPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Settings className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Sistema
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Configurações
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Centralize ajustes administrativos da loja online, integrações e
              áreas de manutenção do sistema.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {configuracoes.map((configuracao) => (
          <HubCard key={configuracao.href} {...configuracao} />
        ))}
      </section>
    </main>
  );
}
