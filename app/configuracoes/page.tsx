import type { ElementType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  PlugZap,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  UserCog,
} from "lucide-react";
import { exigirAdmin } from "@/lib/auth/admin";
import { usuarioTemPermissao } from "@/lib/permissoes/perfis";

export const metadata: Metadata = {
  title: "Configuracoes | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type HubCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ElementType;
  tone?: "default" | "site" | "system" | "warning";
  badge?: string;
};

function cardToneClass(tone: HubCardProps["tone"]) {
  if (tone === "site") return "hover:ring-indigo-200";
  if (tone === "system") return "hover:ring-violet-200";
  if (tone === "warning") return "hover:ring-amber-200";
  return "hover:ring-slate-300";
}

function iconToneClass(tone: HubCardProps["tone"]) {
  if (tone === "site") return "bg-indigo-50 text-indigo-700";
  if (tone === "system") return "bg-violet-50 text-violet-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function HubCard({
  href,
  title,
  description,
  icon: Icon,
  tone = "default",
  badge,
}: HubCardProps) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${cardToneClass(tone)}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconToneClass(tone)}`}>
            <Icon className="h-5 w-5" />
          </div>
          {badge ? (
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
              {badge}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:text-slate-950">
        Abrir
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
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
    <div>
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function ConfiguracoesPage() {
  const usuario = await exigirAdmin();
  const podeVerLoja =
    usuario.perfil === "ACESSO_GERAL" ||
    usuarioTemPermissao(usuario, "lojaOnline", "ver");
  const podeVerSistema =
    usuario.perfil === "ACESSO_GERAL" ||
    usuarioTemPermissao(usuario, "configuracoes", "ver");
  const podeVerNotificacoes =
    usuario.perfil === "ACESSO_GERAL" ||
    usuarioTemPermissao(usuario, "notificacoes", "ver");
  const podeGerenciarUsuarios = usuario.perfil === "ACESSO_GERAL";

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Sistema
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Configuracoes
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Hub administrativo da plataforma: acesso, loja online,
              integracoes e manutencao em grupos separados.
            </p>
          </div>

          {podeVerNotificacoes ? (
            <Link
              href="/notificacoes"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              Caixa de entrada
            </Link>
          ) : null}
        </div>
      </section>

      {podeVerSistema ? (
        <section>
          <SectionHeader
            title="Sistema e acesso"
            description="Perfis, permissoes e regras internas da plataforma."
          />
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HubCard
              href="/configuracoes/perfis"
              title="Perfis e Permissoes"
              description="Cargos administrativos, acessos por modulo e regras de notificacao."
              icon={ShieldCheck}
              tone="system"
            />
            {podeGerenciarUsuarios ? (
              <HubCard
                href="/configuracoes/usuarios"
                title="Usuarios Administrativos"
                description="Contas internas, acesso base, status e troca segura de senha."
                icon={UserCog}
                tone="system"
              />
            ) : null}
            <HubCard
              href="/notificacoes"
              title="Notificacoes"
              description="Caixa de entrada operacional com filtros, leitura e exclusao em lote."
              icon={Bell}
              tone="warning"
            />
          </div>
        </section>
      ) : null}

      {podeVerLoja ? (
        <section>
          <SectionHeader
            title="Loja"
            description="Configuracoes do site publico, builder e navegacao."
          />
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HubCard
              href="/configuracoes/loja"
              title="Loja Online"
              description="Paginas, editor visual, categorias, menu, frete, cupons e formularios."
              icon={Store}
              tone="site"
              badge="hub"
            />
            <HubCard
              href="/configuracoes/loja/colecoes-inteligentes"
              title="Colecoes Inteligentes"
              description="Grupos aprovados de produtos para alimentar blocos do builder."
              icon={Store}
              tone="site"
            />
            <HubCard
              href="/configuracoes/loja/paginas"
              title="Paginas e Builder"
              description="Home, paginas publicas e blocos do editor visual da loja."
              icon={Store}
              tone="site"
            />
            <HubCard
              href="/configuracoes/loja/menu-rodape"
              title="Menu e Rodape"
              description="Navegacao publica, links do menu e referencias do rodape."
              icon={Store}
              tone="site"
            />
          </div>
        </section>
      ) : null}

      {podeVerSistema ? (
        <section>
          <SectionHeader
            title="Operacao e avancado"
            description="Integracoes, manutencao e areas tecnicas com acesso controlado."
          />
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HubCard
              href="/configuracoes/integracoes"
              title="Integracoes"
              description="Canais conectados, importacoes e vinculos de produtos por canal."
              icon={PlugZap}
              tone="system"
            />
            <HubCard
              href="/lixeira"
              title="Lixeira"
              description="Itens removidos e restauracao de cadastros quando necessario."
              icon={Trash2}
              tone="system"
            />
          </div>
        </section>
      ) : null}

      {!podeVerSistema && !podeVerLoja ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <Settings className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Nenhuma configuracao disponivel para este perfil.
          </p>
        </section>
      ) : null}
    </main>
  );
}
