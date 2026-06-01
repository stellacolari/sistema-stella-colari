"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  Monitor,
  MousePointer2,
  PanelRight,
  Plus,
  Smartphone,
  Tablet,
  Trash2,
  Type,
} from "lucide-react";

export type EditorVisualPagina = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  statusPublicacao: string;
  urlPublica: string;
};

export type EditorVisualBloco = {
  id: string;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ordem: number;
  configJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
};

export type EditorVisualCategoria = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

type EditorVisualPaginaClientProps = {
  pagina: EditorVisualPagina;
  blocos: EditorVisualBloco[];
  categoriasDisponiveis: EditorVisualCategoria[];
};

type DevicePreview = "DESKTOP" | "TABLET" | "MOBILE";

function getConfigObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getStringConfig(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getArrayConfig(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getTipoLabel(tipo: string) {
  if (tipo === "HERO") return "Banner / Hero";
  if (tipo === "BANNER") return "Banner";
  if (tipo === "TEXTO_IMAGEM") return "Texto + imagem";
  if (tipo === "PRODUTOS") return "Produtos";
  if (tipo === "LISTA_PRODUTOS") return "Lista de produtos";
  if (tipo === "CATEGORIAS") return "Categorias";
  if (tipo === "FAQ") return "FAQ";
  if (tipo === "FORMULARIO") return "Formulário";
  if (tipo === "TEXTO") return "Texto";
  if (tipo === "IMAGEM") return "Imagem";

  return tipo.replaceAll("_", " ");
}

function getBlocoIcon(tipo: string) {
  if (tipo.includes("IMAGEM") || tipo === "HERO" || tipo === "BANNER") {
    return ImageIcon;
  }

  if (tipo.includes("PRODUTO") || tipo.includes("CATEGORIA")) {
    return LayoutGrid;
  }

  if (tipo.includes("TEXTO") || tipo === "FAQ") {
    return Type;
  }

  return LayoutGrid;
}

function getFrameClass(device: DevicePreview) {
  if (device === "MOBILE") {
    return "mx-auto max-w-[390px]";
  }

  if (device === "TABLET") {
    return "mx-auto max-w-[820px]";
  }

  return "mx-auto max-w-full";
}

function getFrameLabel(device: DevicePreview) {
  if (device === "MOBILE") return "Mobile";
  if (device === "TABLET") return "Tablet";
  return "Desktop";
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function ordenarBlocos(items: EditorVisualBloco[]) {
  return [...items].sort((a, b) => {
    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem;
    }

    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  });
}

function BlocoActionsPopup({ ativo }: { ativo: boolean }) {
  return (
    <div className="absolute right-3 top-3 z-20 hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur group-hover:flex">
      <button
        type="button"
        className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Editar
      </button>

      <button
        type="button"
        className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Duplicar
      </button>

      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {ativo ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        {ativo ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

function PreviewShell({
  children,
  device,
}: {
  children: ReactNode;
  device: DevicePreview;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
          {device === "TABLET" && <Tablet className="h-4 w-4" />}
          {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
          Preview {getFrameLabel(device)}
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
          Renderização simulada
        </span>
      </div>

      <div
        className={`overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 ${getFrameClass(
          device
        )}`}
      >
        {children}
      </div>
    </div>
  );
}

function RenderBlocoPreview({
  bloco,
  selecionado,
  onSelect,
  device,
}: {
  bloco: EditorVisualBloco;
  selecionado: boolean;
  onSelect: () => void;
  device: DevicePreview;
}) {
  const config = getConfigObject(bloco.configJson);

  const titulo =
    getStringConfig(config, "titulo") ||
    bloco.titulo ||
    getTipoLabel(bloco.tipo);

  const texto =
    getStringConfig(config, "texto") ||
    getStringConfig(config, "descricao") ||
    getStringConfig(config, "conteudo");

  const imagemUrl =
    getStringConfig(config, "imagemUrl") ||
    getStringConfig(config, "imagem") ||
    getStringConfig(config, "backgroundImageUrl");

  const categorias = getArrayConfig(config, "categorias");
  const produtos = getArrayConfig(config, "produtos");

  const isMobile = device === "MOBILE";

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      className={`group relative cursor-pointer border-2 transition ${
        selecionado
          ? "border-indigo-500 bg-indigo-50/40"
          : "border-transparent hover:border-indigo-200"
      } ${bloco.ativo ? "" : "opacity-50"}`}
    >
      <BlocoActionsPopup ativo={bloco.ativo} />

      <div className="absolute left-3 top-3 z-10 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm group-hover:flex">
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
        {getTipoLabel(bloco.tipo)}
      </div>

      {bloco.tipo === "HERO" || bloco.tipo.includes("BANNER") ? (
        <div
          className={`relative overflow-hidden bg-slate-900 ${
            isMobile ? "h-[520px]" : "h-[420px]"
          }`}
        >
          {imagemUrl ? (
            <img
              src={imagemUrl}
              alt={titulo}
              className="h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-medium text-slate-500">
              Banner sem imagem
            </div>
          )}

          <div className="absolute inset-0 bg-black/20" />

          <div
            className={`absolute inset-0 flex items-center ${
              isMobile ? "justify-center px-6 text-center" : "px-12"
            }`}
          >
            <div className={isMobile ? "max-w-sm" : "max-w-xl"}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Stella
              </p>

              <h2
                className={`mt-3 font-light tracking-tight text-white ${
                  isMobile ? "text-4xl" : "text-5xl"
                }`}
              >
                {titulo}
              </h2>

              {texto && (
                <p className="mt-4 text-sm leading-6 text-white/80">{texto}</p>
              )}

              <div className="mt-6 inline-flex bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                Conhecer
              </div>
            </div>
          </div>
        </div>
      ) : bloco.tipo === "TEXTO_IMAGEM" ? (
        <div
          className={`grid bg-white ${
            isMobile ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          <div className="min-h-[260px] bg-slate-100">
            {imagemUrl ? (
              <img
                src={imagemUrl}
                alt={titulo}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-slate-400">
                Sem imagem
              </div>
            )}
          </div>

          <div className="flex items-center p-8">
            <div>
              <h2 className="text-3xl font-light tracking-tight text-slate-950">
                {titulo}
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {texto || "Texto do bloco aparece aqui."}
              </p>
            </div>
          </div>
        </div>
      ) : bloco.tipo.includes("PRODUTO") ? (
        <div className="bg-white px-6 py-10">
          <h2 className="text-2xl font-light tracking-tight text-slate-950">
            {titulo}
          </h2>

          <div
            className={`mt-6 grid gap-3 ${
              isMobile ? "grid-cols-2" : "grid-cols-4"
            }`}
          >
            {Array.from({ length: isMobile ? 4 : 8 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-square bg-slate-100" />
                <div className="mt-3 h-3 w-3/4 bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 bg-slate-100" />
              </div>
            ))}
          </div>

          {(categorias.length > 0 || produtos.length > 0) && (
            <p className="mt-5 text-xs text-slate-400">
              Fonte configurada:{" "}
              {[...categorias, ...produtos].slice(0, 4).join(", ")}
            </p>
          )}
        </div>
      ) : bloco.tipo.includes("CATEGORIA") ? (
        <div className="bg-white px-6 py-10">
          <h2 className="text-2xl font-light tracking-tight text-slate-950">
            {titulo}
          </h2>

          <div
            className={`mt-6 grid gap-4 ${
              isMobile ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => (
              <div key={index} className="text-center">
                <div className="aspect-square bg-slate-100" />
                <div className="mx-auto mt-3 h-3 w-2/3 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : bloco.tipo === "FAQ" ? (
        <div className="bg-white px-6 py-10">
          <h2 className="text-2xl font-light tracking-tight text-slate-950">
            {titulo}
          </h2>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-slate-200 px-4 py-4">
                <div className="h-3 w-2/3 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white px-6 py-10">
          <h2 className="text-2xl font-light tracking-tight text-slate-950">
            {titulo}
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            {texto || "Conteúdo do bloco será exibido aqui."}
          </p>
        </div>
      )}
    </section>
  );
}

export default function EditorVisualPaginaClient({
  pagina,
  blocos,
  categoriasDisponiveis,
}: EditorVisualPaginaClientProps) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);

  const [blocosEditor, setBlocosEditor] = useState<EditorVisualBloco[]>(() =>
    ordenarBlocos(blocos)
  );

  const blocosOrdenados = useMemo(() => {
    return ordenarBlocos(blocosEditor);
  }, [blocosEditor]);

  const [device, setDevice] = useState<DevicePreview>("DESKTOP");
  const [blocoSelecionadoId, setBlocoSelecionadoId] = useState(
    blocosOrdenados[0]?.id || ""
  );

  const blocoSelecionado =
    blocosOrdenados.find((bloco) => bloco.id === blocoSelecionadoId) || null;

  function atualizarBlocoLocal(
    blocoId: string,
    data: Partial<EditorVisualBloco>
  ) {
    setBlocosEditor((current) =>
      current.map((bloco) =>
        bloco.id === blocoId
          ? {
              ...bloco,
              ...data,
            }
          : bloco
      )
    );
  }

  async function atualizarBloco(
    bloco: EditorVisualBloco,
    data: Partial<EditorVisualBloco>
  ) {
    setErro("");
    setSucesso("");

    const blocoAnterior = { ...bloco };
    atualizarBlocoLocal(bloco.id, data);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await lerRespostaApi(response);

      if (!response.ok) {
        atualizarBlocoLocal(bloco.id, blocoAnterior);
        setErro(result.error || result.message || "Erro ao atualizar bloco.");
        return;
      }

      if (result.bloco) {
        atualizarBlocoLocal(bloco.id, {
          titulo: result.bloco.titulo,
          ativo: result.bloco.ativo,
          ordem: result.bloco.ordem,
          configJson: result.bloco.configJson,
          atualizadoEm:
            typeof result.bloco.atualizadoEm === "string"
              ? result.bloco.atualizadoEm
              : new Date().toISOString(),
        });
      }

      setSucesso("Bloco atualizado.");
    } catch {
      atualizarBlocoLocal(bloco.id, blocoAnterior);
      setErro("Erro ao atualizar bloco.");
    }
  }

  async function salvarOrdemBlocos(novaLista: EditorVisualBloco[]) {
    setErro("");
    setSucesso("");
    setOrdemSalvando(true);

    const listaAnterior = [...blocosEditor];
    setBlocosEditor(novaLista);

    try {
      const responses = await Promise.all(
        novaLista.map((bloco, index) =>
          fetch(
            `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ordem: index,
              }),
            }
          )
        )
      );

      const erroResponse = responses.find((response) => !response.ok);

      if (erroResponse) {
        setBlocosEditor(listaAnterior);
        setErro("Erro ao salvar ordem dos blocos.");
        return;
      }

      setSucesso("Ordem dos blocos atualizada.");
    } catch {
      setBlocosEditor(listaAnterior);
      setErro("Erro ao salvar ordem dos blocos.");
    } finally {
      setOrdemSalvando(false);
    }
  }

  async function moverBlocoPorSeta(blocoId: string, direcao: "CIMA" | "BAIXO") {
    if (ordemSalvando) return;

    const indexAtual = blocosOrdenados.findIndex((bloco) => bloco.id === blocoId);

    if (indexAtual < 0) return;

    const novoIndex = direcao === "CIMA" ? indexAtual - 1 : indexAtual + 1;

    if (novoIndex < 0 || novoIndex >= blocosOrdenados.length) return;

    const novaLista = [...blocosOrdenados];
    const [blocoMovido] = novaLista.splice(indexAtual, 1);

    novaLista.splice(novoIndex, 0, blocoMovido);

    const listaComOrdem = novaLista.map((bloco, index) => ({
      ...bloco,
      ordem: index,
    }));

    await salvarOrdemBlocos(listaComOrdem);
  }

  async function excluirBloco(bloco: EditorVisualBloco) {
    const confirmado = window.confirm(
      `Excluir o bloco ${bloco.titulo || getTipoLabel(bloco.tipo)}?`
    );

    if (!confirmado) return;

    setErro("");
    setSucesso("");

    const listaAnterior = [...blocosEditor];

    setBlocosEditor((current) => current.filter((item) => item.id !== bloco.id));

    if (blocoSelecionadoId === bloco.id) {
      const proximoBloco = blocosOrdenados.find((item) => item.id !== bloco.id);
      setBlocoSelecionadoId(proximoBloco?.id || "");
    }

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setBlocosEditor(listaAnterior);
        setErro(data.error || data.message || "Erro ao excluir bloco.");
        return;
      }

      setSucesso("Bloco excluído.");
    } catch {
      setBlocosEditor(listaAnterior);
      setErro("Erro ao excluir bloco.");
    }
  }

  async function criarBlocoBasico() {
    setErro("");
    setSucesso("");
    setSalvando(true);

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "BANNER",
            titulo: "Novo banner",
          }),
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || data.message || "Erro ao criar bloco.");
        return;
      }

      if (data.bloco) {
        const novoBloco: EditorVisualBloco = {
          id: data.bloco.id,
          tipo: data.bloco.tipo,
          titulo: data.bloco.titulo,
          ativo: data.bloco.ativo,
          ordem: data.bloco.ordem,
          configJson: data.bloco.configJson,
          criadoEm:
            typeof data.bloco.criadoEm === "string"
              ? data.bloco.criadoEm
              : new Date().toISOString(),
          atualizadoEm:
            typeof data.bloco.atualizadoEm === "string"
              ? data.bloco.atualizadoEm
              : new Date().toISOString(),
        };

        setBlocosEditor((current) => ordenarBlocos([...current, novoBloco]));
        setBlocoSelecionadoId(novoBloco.id);
        setSucesso("Bloco criado.");
      }
    } catch {
      setErro("Erro ao criar bloco.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {(erro || sucesso) && (
        <div>
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {sucesso}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="h-fit rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
          <div className="flex items-center gap-2">
            <PanelRight className="h-5 w-5 text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950">Blocos</h2>
          </div>

          <button
            type="button"
            onClick={criarBlocoBasico}
            disabled={salvando || isPending}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {salvando ? "Criando..." : "Adicionar banner"}
          </button>

          <div className="mt-4 space-y-2">
            {blocosOrdenados.map((bloco) => {
              const Icon = getBlocoIcon(bloco.tipo);
              const selecionado = bloco.id === blocoSelecionadoId;

              return (
                <button
                  key={bloco.id}
                  type="button"
                  onClick={() => setBlocoSelecionadoId(bloco.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selecionado
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {bloco.titulo || getTipoLabel(bloco.tipo)}
                    </span>

                    <span className="mt-0.5 block text-xs text-slate-500">
                      {getTipoLabel(bloco.tipo)} · Ordem {bloco.ordem}
                    </span>

                    {!bloco.ativo && (
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Inativo
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {blocosOrdenados.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum bloco nesta página.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Preview ao vivo
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Primeira versão visual. A renderização ainda é simulada e será
                aproximada da loja pública nas próximas etapas.
              </p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setDevice("DESKTOP")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "DESKTOP"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>

              <button
                type="button"
                onClick={() => setDevice("TABLET")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "TABLET"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Tablet className="h-4 w-4" />
                Tablet
              </button>

              <button
                type="button"
                onClick={() => setDevice("MOBILE")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  device === "MOBILE"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>
          </div>

          <PreviewShell device={device}>
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-950">
                  STELLA
                </div>

                {device !== "MOBILE" ? (
                  <div className="flex gap-5 text-sm text-slate-500">
                    <span>Home</span>
                    <span>Categorias</span>
                    <span>Descontos</span>
                  </div>
                ) : (
                  <MousePointer2 className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>

            {blocosOrdenados.map((bloco) => (
              <RenderBlocoPreview
                key={bloco.id}
                bloco={bloco}
                selecionado={bloco.id === blocoSelecionadoId}
                onSelect={() => setBlocoSelecionadoId(bloco.id)}
                device={device}
              />
            ))}

            {blocosOrdenados.length === 0 && (
              <div className="flex min-h-[420px] items-center justify-center bg-white p-8 text-center">
                <div>
                  <LayoutGrid className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Página sem blocos
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Adicione o primeiro bloco para começar a montar a página.
                  </p>
                </div>
              </div>
            )}
          </PreviewShell>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 xl:sticky xl:top-6">
          <div className="flex items-center gap-2">
            <PanelRight className="h-5 w-5 text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950">Painel lateral</h2>
          </div>

          {blocoSelecionado ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Bloco selecionado
                </p>

                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  {blocoSelecionado.titulo ||
                    getTipoLabel(blocoSelecionado.tipo)}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {getTipoLabel(blocoSelecionado.tipo)} · Ordem{" "}
                  {blocoSelecionado.ordem}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Ajustes do modo atual
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Você está editando em modo{" "}
                  <strong>{getFrameLabel(device)}</strong>. Nas próximas etapas,
                  este painel terá controles específicos para desktop, tablet e
                  mobile.
                </p>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Editar conteúdo
                </button>

                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Duplicar bloco
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void atualizarBloco(blocoSelecionado, {
                      ativo: !blocoSelecionado.ativo,
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {blocoSelecionado.ativo ? "Ocultar bloco" : "Ativar bloco"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void moverBlocoPorSeta(blocoSelecionado.id, "CIMA")
                    }
                    disabled={ordemSalvando}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Subir
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void moverBlocoPorSeta(blocoSelecionado.id, "BAIXO")
                    }
                    disabled={ordemSalvando}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Descer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void excluirBloco(blocoSelecionado)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir bloco
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Categorias disponíveis
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {categoriasDisponiveis.length} categorias carregadas para uso
                  em blocos de produtos, categorias e campanhas.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <PanelRight className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Nenhum bloco selecionado
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Clique em um bloco no preview ou na lista para editar suas
                configurações.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}