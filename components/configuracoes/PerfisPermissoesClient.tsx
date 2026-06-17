"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, Check, Plus, Save, Shield, Users } from "lucide-react";
import { ACOES_PERMISSAO, MODULOS_PERMISSAO, normalizarPermissoes, type PermissoesPerfil } from "@/lib/permissoes/perfis";

type Usuario = { id: string; nome: string; email: string; perfil: string; perfilAdministrativoId: string | null; ativo: boolean };
type Perfil = {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  tipoBase: string;
  ativo: boolean;
  permissoesJson: unknown;
  usuarios: Usuario[];
};
type Regra = {
  id: string;
  tipoNotificacao: string;
  categoria: string;
  prioridadeMinima: string;
  perfilId: string | null;
  usuarioId: string | null;
  ativo: boolean;
  canalInApp: boolean;
  canalWhatsappFuturo: boolean;
  canalSmsFuturo: boolean;
  canalEmailFuturo: boolean;
};

const tiposBase = ["ADMIN_GERAL", "OPERACAO", "VENDEDOR", "MARKETING", "FINANCEIRO", "ESTOQUE", "ATENDIMENTO", "PERSONALIZADO"];
const categorias = ["PEDIDO", "OPERACIONAL", "REPOSICAO", "RECOMENDACAO", "CAMPANHA", "PRECIFICACAO", "FINANCEIRO", "SISTEMA", "MELHORIA"];
const prioridades = ["INFO", "BAIXA", "MEDIA", "ALTA", "CRITICA"];

export default function PerfisPermissoesClient({
  perfis: perfisIniciais,
  usuarios,
  regras: regrasIniciais,
}: {
  perfis: Perfil[];
  usuarios: Usuario[];
  regras: Regra[];
}) {
  const [aba, setAba] = useState<"perfis" | "notificacoes">("perfis");
  const [perfis, setPerfis] = useState(perfisIniciais);
  const [regras, setRegras] = useState(regrasIniciais);
  const [perfilId, setPerfilId] = useState(perfisIniciais[0]?.id || "");
  const [mensagem, setMensagem] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [isPending, startTransition] = useTransition();
  const perfil = perfis.find((item) => item.id === perfilId) || perfis[0];
  const permissoes = useMemo(() => normalizarPermissoes(perfil?.permissoesJson as never, perfil?.codigo), [perfil]);
  const usuariosVinculados = new Set(perfil?.usuarios.map((usuario) => usuario.id) || []);

  function salvarPerfil(patch: Partial<Perfil> & { permissoesJson?: PermissoesPerfil; usuarioIds?: string[] }) {
    if (!perfil) return;
    startTransition(async () => {
      const response = await fetch(`/api/configuracoes/perfis/${perfil.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel salvar.");
        return;
      }
      setPerfis((current) => current.map((item) => (item.id === perfil.id ? { ...item, ...patch, permissoesJson: patch.permissoesJson || item.permissoesJson } : item)));
      setMensagem("Perfil atualizado.");
    });
  }

  function criarPerfil() {
    if (!novoNome.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/configuracoes/perfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, tipoBase: "PERSONALIZADO" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel criar.");
        return;
      }
      setPerfis((current) => [...current, { ...data.perfil, usuarios: [] }]);
      setPerfilId(data.perfil.id);
      setNovoNome("");
      setMensagem("Perfil criado.");
    });
  }

  function alternarPermissao(modulo: string, acao: string) {
    const atual = new Set(permissoes[modulo] || []);
    if (atual.has(acao)) atual.delete(acao);
    else atual.add(acao);
    salvarPerfil({ permissoesJson: { ...permissoes, [modulo]: [...atual] } });
  }

  function alternarUsuario(usuarioId: string) {
    const next = new Set(usuariosVinculados);
    if (next.has(usuarioId)) next.delete(usuarioId);
    else next.add(usuarioId);
    salvarPerfil({ usuarioIds: [...next] });
  }

  function criarRegra() {
    startTransition(async () => {
      const response = await fetch("/api/configuracoes/perfis/regras-notificacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoNotificacao: "*", categoria: "PEDIDO", perfilId: perfil?.id || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel criar a regra.");
        return;
      }
      setRegras((current) => [data.regra, ...current]);
      setMensagem("Regra criada.");
    });
  }

  function salvarRegra(id: string, patch: Partial<Regra>) {
    startTransition(async () => {
      const response = await fetch(`/api/configuracoes/perfis/regras-notificacao/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMensagem(data.error || "Nao foi possivel salvar a regra.");
        return;
      }
      setRegras((current) => current.map((item) => (item.id === id ? { ...item, ...data.regra } : item)));
      setMensagem("Regra atualizada.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Sistema</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Perfis e Permissoes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Controle cargos administrativos, acessos por modulo e distribuicao interna de notificacoes.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setAba("perfis")} className={`rounded-md px-4 py-2 text-sm font-bold ${aba === "perfis" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Perfis</button>
            <button type="button" onClick={() => setAba("notificacoes")} className={`rounded-md px-4 py-2 text-sm font-bold ${aba === "notificacoes" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Notificacoes</button>
          </div>
        </div>
      </section>

      {mensagem ? <div className="border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{mensagem}</div> : null}

      {aba === "perfis" && perfil ? (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex gap-2">
                <input value={novoNome} onChange={(event) => setNovoNome(event.target.value)} placeholder="Novo perfil" className="min-h-10 min-w-0 flex-1 border border-slate-200 px-3 text-sm outline-none" />
                <button type="button" onClick={criarPerfil} disabled={isPending} className="inline-flex h-10 w-10 items-center justify-center bg-slate-950 text-white disabled:opacity-60" title="Criar perfil"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            {perfis.map((item) => (
              <button key={item.id} type="button" onClick={() => setPerfilId(item.id)} className={`flex w-full items-center gap-3 border p-4 text-left transition ${item.id === perfil.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}>
                <Shield className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{item.nome}</span>
                  <span className="block truncate text-xs opacity-70">{item.codigo}</span>
                </span>
              </button>
            ))}
          </aside>

          <main className="space-y-4">
            <section className="grid gap-3 bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-slate-700">Nome
                <input defaultValue={perfil.nome} onBlur={(event) => salvarPerfil({ nome: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Tipo base
                <select value={perfil.tipoBase} onChange={(event) => salvarPerfil({ tipoBase: event.target.value })} className="mt-1 w-full border border-slate-200 px-3 py-2 font-normal">
                  {tiposBase.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Descricao
                <textarea defaultValue={perfil.descricao || ""} onBlur={(event) => salvarPerfil({ descricao: event.target.value })} className="mt-1 min-h-20 w-full border border-slate-200 px-3 py-2 font-normal" />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={perfil.ativo} onChange={(event) => salvarPerfil({ ativo: event.target.checked })} />
                Perfil ativo
              </label>
            </section>

            <section className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><Check className="h-4 w-4" /> Permissoes por modulo</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Modulo</th>{ACOES_PERMISSAO.map((acao) => <th key={acao} className="px-2 py-2">{acao}</th>)}</tr>
                  </thead>
                  <tbody>
                    {MODULOS_PERMISSAO.map((modulo) => (
                      <tr key={modulo.codigo} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-bold text-slate-800">{modulo.nome}</td>
                        {ACOES_PERMISSAO.map((acao) => (
                          <td key={acao} className="px-2 py-2">
                            <input type="checkbox" checked={permissoes[modulo.codigo]?.includes(acao) || false} onChange={() => alternarPermissao(modulo.codigo, acao)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><Users className="h-4 w-4" /> Usuarios vinculados</div>
              <div className="grid gap-2 md:grid-cols-2">
                {usuarios.map((usuario) => (
                  <label key={usuario.id} className="flex items-center gap-3 border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" checked={usuariosVinculados.has(usuario.id)} onChange={() => alternarUsuario(usuario.id)} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900">{usuario.nome}</span>
                      <span className="block truncate text-xs text-slate-500">{usuario.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </main>
        </div>
      ) : null}

      {aba === "notificacoes" ? (
        <section className="bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900"><Bell className="h-4 w-4" /> Regras de notificacao por perfil</div>
            <button type="button" onClick={criarRegra} className="inline-flex items-center gap-2 bg-slate-950 px-3 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Nova regra</button>
          </div>
          <div className="space-y-3">
            {regras.map((regra) => (
              <div key={regra.id} className="grid gap-2 border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_150px_1fr_220px]">
                <input value={regra.tipoNotificacao} onChange={(event) => salvarRegra(regra.id, { tipoNotificacao: event.target.value })} className="border border-slate-200 px-3 py-2 text-sm" />
                <select value={regra.categoria} onChange={(event) => salvarRegra(regra.id, { categoria: event.target.value })} className="border border-slate-200 px-3 py-2 text-sm">
                  {categorias.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={regra.prioridadeMinima} onChange={(event) => salvarRegra(regra.id, { prioridadeMinima: event.target.value })} className="border border-slate-200 px-3 py-2 text-sm">
                  {prioridades.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={regra.perfilId || ""} onChange={(event) => salvarRegra(regra.id, { perfilId: event.target.value || null })} className="border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Sem perfil</option>
                  {perfis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                  <label><input type="checkbox" checked={regra.ativo} onChange={(event) => salvarRegra(regra.id, { ativo: event.target.checked })} /> Ativa</label>
                  <label><input type="checkbox" checked={regra.canalInApp} onChange={(event) => salvarRegra(regra.id, { canalInApp: event.target.checked })} /> In-app</label>
                  <label><input type="checkbox" checked={regra.canalWhatsappFuturo} onChange={(event) => salvarRegra(regra.id, { canalWhatsappFuturo: event.target.checked })} /> WhatsApp</label>
                  <label><input type="checkbox" checked={regra.canalSmsFuturo} onChange={(event) => salvarRegra(regra.id, { canalSmsFuturo: event.target.checked })} /> SMS</label>
                  <label><input type="checkbox" checked={regra.canalEmailFuturo} onChange={(event) => salvarRegra(regra.id, { canalEmailFuturo: event.target.checked })} /> E-mail</label>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Save className="h-3.5 w-3.5" />
        Canais WhatsApp, SMS e e-mail ficam apenas preparados para envio externo futuro.
      </div>
    </div>
  );
}
