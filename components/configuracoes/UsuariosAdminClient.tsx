"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  XCircle,
} from "lucide-react";

type PerfilAdministrativoResumo = {
  id: string;
  nome: string;
  codigo: string;
  tipoBase: string;
  ativo: boolean;
};

type UsuarioAdminView = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  perfilAdministrativoId: string | null;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  perfilAdministrativo: PerfilAdministrativoResumo | null;
};

type UsuarioForm = {
  nome: string;
  email: string;
  perfil: string;
  perfilAdministrativoId: string;
  ativo: boolean;
};

type NovoUsuarioForm = UsuarioForm & {
  senha: string;
};

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const labelClass =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500";
const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const novoUsuarioPadrao: NovoUsuarioForm = {
  nome: "",
  email: "",
  senha: "",
  perfil: "VENDEDOR",
  perfilAdministrativoId: "",
  ativo: true,
};

function getUsuarioForm(usuario: UsuarioAdminView): UsuarioForm {
  return {
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    perfilAdministrativoId: usuario.perfilAdministrativoId || "",
    ativo: usuario.ativo,
  };
}

function labelPerfil(perfil: string) {
  if (perfil === "ACESSO_GERAL") return "Admin geral";
  if (perfil === "VENDEDOR") return "Vendedor";
  return perfil;
}

function formatarData(valor: string | null) {
  if (!valor) return "Nunca";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function ordenarUsuarios(usuarios: UsuarioAdminView[]) {
  return [...usuarios].sort((a, b) => {
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export default function UsuariosAdminClient({
  usuariosIniciais,
  perfis,
  usuarioAtualId,
}: {
  usuariosIniciais: UsuarioAdminView[];
  perfis: PerfilAdministrativoResumo[];
  usuarioAtualId: string;
}) {
  const [usuarios, setUsuarios] = useState(() => ordenarUsuarios(usuariosIniciais));
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(
    usuariosIniciais[0]?.id || "",
  );
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">(
    "ativos",
  );
  const [form, setForm] = useState<UsuarioForm | null>(
    usuariosIniciais[0] ? getUsuarioForm(usuariosIniciais[0]) : null,
  );
  const [senha, setSenha] = useState("");
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuarioForm>(
    novoUsuarioPadrao,
  );
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const usuarioSelecionado = useMemo(
    () => usuarios.find((usuario) => usuario.id === usuarioSelecionadoId) || null,
    [usuarios, usuarioSelecionadoId],
  );

  useEffect(() => {
    if (!usuarioSelecionado) {
      setForm(null);
      setSenha("");
      return;
    }

    setForm(getUsuarioForm(usuarioSelecionado));
    setSenha("");
  }, [usuarioSelecionado]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      if (filtroStatus === "ativos" && !usuario.ativo) return false;
      if (filtroStatus === "inativos" && usuario.ativo) return false;

      if (!termo) return true;

      return [usuario.nome, usuario.email, usuario.perfil, usuario.perfilAdministrativo?.nome || ""]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [busca, filtroStatus, usuarios]);

  const ativos = usuarios.filter((usuario) => usuario.ativo).length;
  const adminsAtivos = usuarios.filter(
    (usuario) => usuario.ativo && usuario.perfil === "ACESSO_GERAL",
  ).length;

  function atualizarUsuarioNaLista(usuarioAtualizado: UsuarioAdminView) {
    setUsuarios((current) =>
      ordenarUsuarios(
        current.map((usuario) =>
          usuario.id === usuarioAtualizado.id ? usuarioAtualizado : usuario,
        ),
      ),
    );
  }

  function salvarUsuario() {
    if (!usuarioSelecionado || !form) return;

    const patch: Record<string, unknown> = {};

    if (form.nome !== usuarioSelecionado.nome) patch.nome = form.nome;
    if (form.email !== usuarioSelecionado.email) patch.email = form.email;
    if (form.perfil !== usuarioSelecionado.perfil) patch.perfil = form.perfil;
    if ((form.perfilAdministrativoId || "") !== (usuarioSelecionado.perfilAdministrativoId || "")) {
      patch.perfilAdministrativoId = form.perfilAdministrativoId || null;
    }
    if (form.ativo !== usuarioSelecionado.ativo) patch.ativo = form.ativo;
    if (senha.trim()) patch.senha = senha;

    if (Object.keys(patch).length === 0) {
      setMensagem("Nenhuma alteracao pendente para salvar.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/configuracoes/usuarios/${usuarioSelecionado.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel salvar o usuario.");
        return;
      }

      atualizarUsuarioNaLista(data.usuario);
      setSenha("");
      setMensagem("Usuario atualizado.");
    });
  }

  function criarUsuario() {
    startTransition(async () => {
      const response = await fetch("/api/configuracoes/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...novoUsuario,
          perfilAdministrativoId: novoUsuario.perfilAdministrativoId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel criar o usuario.");
        return;
      }

      setUsuarios((current) => ordenarUsuarios([...current, data.usuario]));
      setUsuarioSelecionadoId(data.usuario.id);
      setNovoUsuario(novoUsuarioPadrao);
      setMensagem("Usuario criado.");
    });
  }

  function desativarUsuario() {
    if (!usuarioSelecionado) return;

    const confirmado = window.confirm(
      `Desativar o usuario ${usuarioSelecionado.nome}?`,
    );

    if (!confirmado) return;

    startTransition(async () => {
      const response = await fetch(
        `/api/configuracoes/usuarios/${usuarioSelecionado.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel desativar o usuario.");
        return;
      }

      atualizarUsuarioNaLista(data.usuario);
      setMensagem("Usuario desativado.");
    });
  }

  function reativarUsuario() {
    if (!usuarioSelecionado) return;

    startTransition(async () => {
      const response = await fetch(
        `/api/configuracoes/usuarios/${usuarioSelecionado.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ativo: true }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel reativar o usuario.");
        return;
      }

      atualizarUsuarioNaLista(data.usuario);
      setMensagem("Usuario reativado.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Sistema e acesso
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Usuarios administrativos
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Cadastros internos, status de acesso e vinculo com perfis administrativos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {ativos} ativos
            </span>
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              {adminsAtivos} admins gerais
            </span>
            <Link href="/configuracoes/perfis" className={secondaryButtonClass}>
              <ShieldCheck className="h-4 w-4" />
              Perfis
            </Link>
          </div>
        </div>
      </section>

      {mensagem ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          {mensagem}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <label className={labelClass}>Buscar</label>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, e-mail ou perfil"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
              {(["ativos", "todos", "inativos"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFiltroStatus(status)}
                  className={`h-9 rounded-xl text-xs font-bold capitalize transition ${
                    filtroStatus === status
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black text-slate-950">
                {usuariosFiltrados.length} usuarios
              </p>
            </div>

            <div className="max-h-[620px] overflow-auto p-2">
              {usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((usuario) => {
                  const selecionado = usuario.id === usuarioSelecionadoId;

                  return (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => setUsuarioSelecionadoId(usuario.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                        selecionado
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-transparent bg-white text-slate-800 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                          selecionado ? "bg-white/10" : "bg-slate-100"
                        }`}
                      >
                        <UserCog className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black">
                            {usuario.nome}
                          </span>
                          {usuario.id === usuarioAtualId ? (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              voce
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-xs opacity-75">
                          {usuario.email}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {labelPerfil(usuario.perfil)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              usuario.ativo
                                ? selecionado
                                  ? "bg-emerald-400/20 text-emerald-100"
                                  : "bg-emerald-50 text-emerald-700"
                                : selecionado
                                  ? "bg-rose-400/20 text-rose-100"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {usuario.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhum usuario encontrado.
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="space-y-4">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            {usuarioSelecionado && form ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={labelClass}>Usuario selecionado</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {usuarioSelecionado.nome}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Ultimo login: {formatarData(usuarioSelecionado.ultimoLoginEm)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {usuarioSelecionado.ativo ? (
                      <button
                        type="button"
                        onClick={desativarUsuario}
                        disabled={isPending || usuarioSelecionado.id === usuarioAtualId}
                        className={secondaryButtonClass}
                      >
                        <Trash2 className="h-4 w-4" />
                        Desativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={reativarUsuario}
                        disabled={isPending}
                        className={secondaryButtonClass}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reativar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={salvarUsuario}
                      disabled={isPending}
                      className={primaryButtonClass}
                    >
                      <Save className="h-4 w-4" />
                      Salvar
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className={labelClass}>Nome</span>
                    <input
                      value={form.nome}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, nome: event.target.value } : current,
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={labelClass}>E-mail</span>
                    <input
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, email: event.target.value } : current,
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={labelClass}>Acesso base</span>
                    <select
                      value={form.perfil}
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, perfil: event.target.value } : current,
                        )
                      }
                      disabled={usuarioSelecionado.id === usuarioAtualId}
                      className={inputClass}
                    >
                      <option value="ACESSO_GERAL">Admin geral</option>
                      <option value="VENDEDOR">Vendedor</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className={labelClass}>Perfil administrativo</span>
                    <select
                      value={form.perfilAdministrativoId}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                perfilAdministrativoId: event.target.value,
                              }
                            : current,
                        )
                      }
                      disabled={usuarioSelecionado.id === usuarioAtualId}
                      className={inputClass}
                    >
                      <option value="">Sem perfil vinculado</option>
                      {perfis.map((perfil) => (
                        <option
                          key={perfil.id}
                          value={perfil.id}
                          disabled={!perfil.ativo}
                        >
                          {perfil.nome}
                          {!perfil.ativo ? " (inativo)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 px-3">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? { ...current, ativo: event.target.checked }
                            : current,
                        )
                      }
                      disabled={usuarioSelecionado.id === usuarioAtualId}
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Usuario ativo
                    </span>
                  </label>

                  <label className="space-y-2">
                    <span className={labelClass}>Nova senha</span>
                    <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3">
                      <KeyRound className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={senha}
                        onChange={(event) => setSenha(event.target.value)}
                        placeholder="Minimo 8 caracteres"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="px-4 py-14 text-center">
                <XCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Selecione um usuario para editar.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <p className={labelClass}>Novo acesso</p>
                <h2 className="text-lg font-black text-slate-950">
                  Criar usuario administrativo
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className={labelClass}>Nome</span>
                <input
                  value={novoUsuario.nome}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      nome: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>E-mail</span>
                <input
                  value={novoUsuario.email}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Senha inicial</span>
                <input
                  type="password"
                  value={novoUsuario.senha}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      senha: event.target.value,
                    }))
                  }
                  placeholder="Minimo 8 caracteres"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Acesso base</span>
                <select
                  value={novoUsuario.perfil}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      perfil: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ACESSO_GERAL">Admin geral</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Perfil administrativo</span>
                <select
                  value={novoUsuario.perfilAdministrativoId}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      perfilAdministrativoId: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Sem perfil vinculado</option>
                  {perfis
                    .filter((perfil) => perfil.ativo)
                    .map((perfil) => (
                      <option key={perfil.id} value={perfil.id}>
                        {perfil.nome}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 px-3">
                <input
                  type="checkbox"
                  checked={novoUsuario.ativo}
                  onChange={(event) =>
                    setNovoUsuario((current) => ({
                      ...current,
                      ativo: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-bold text-slate-700">
                  Criar ativo
                </span>
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={criarUsuario}
                disabled={isPending}
                className={primaryButtonClass}
              >
                <UserPlus className="h-4 w-4" />
                Criar usuario
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
