"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import LinkSugestoesInput from "@/components/configuracoes/loja/LinkSugestoesInput";
import ConfigFaqBloco from "@/components/configuracoes/loja/blocos/ConfigFaqBloco";
import ConfigFormularioBloco from "@/components/configuracoes/loja/blocos/ConfigFormularioBloco";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderTree,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Layers,
  LayoutPanelTop,
  MousePointerClick,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Tags,
  TextQuote,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export type LojaPaginaEditorItem = {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  ativo: boolean;
};

export type CategoriaBuilderOption = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

export type LojaPaginaBlocoItem = {
  id: string;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ordem: number;
  configJson: unknown;
  criadoEm: string;
  atualizadoEm: string;
};

type ApiResult = {
  error?: string;
  message?: string;
  bloco?: LojaPaginaBlocoItem;
};

const TIPOS_BLOCO = [
  {
    value: "BANNER",
    label: "Banner",
    description: "Imagem grande, link e altura configurável.",
    icon: ImageIcon,
  },
  {
    value: "FAIXA_DIFERENCIAIS",
    label: "Faixa de diferenciais",
    description: "Microfaixa com textos curtos, como frete e garantia.",
    icon: Rows3,
  },
  {
    value: "TEXTO",
    label: "Texto / título",
    description: "Título, texto de apoio, fundo e alinhamento.",
    icon: FileText,
  },
  {
    value: "PRODUTOS",
    label: "Produtos",
    description: "Carrossel ou grade paginada de produtos.",
    icon: Layers,
  },
  {
    value: "RECOMENDACOES",
    label: "Recomendações",
    description:
      "Vitrine comercial para produtos recomendados, relacionados ou mais vendidos.",
    icon: Sparkles,
  },
  {
    value: "IMAGEM_TEXTO",
    label: "Imagem + texto",
    description: "Bloco editorial com imagem, texto e botão.",
    icon: LayoutPanelTop,
  },
  {
    value: "FAQ",
    label: "FAQ",
    description: "Perguntas frequentes em acordeão ou lista aberta.",
    icon: HelpCircle,
  },
  {
    value: "FORMULARIO",
    label: "Formulário",
    description: "Captação de contato, orçamento, interesse ou lead.",
    icon: ClipboardList,
  },
  {
    value: "CATEGORIA_HERO",
    label: "Hero da categoria",
    description:
      "Topo dinâmico usando nome, descrição e imagem da categoria atual.",
    icon: FolderTree,
  },
  {
    value: "CATEGORIA_DESCRICAO",
    label: "Descrição da categoria",
    description: "Texto dinâmico da categoria atual com aparência controlada.",
    icon: TextQuote,
  },
  {
    value: "CATEGORIA_SUBCATEGORIAS",
    label: "Subcategorias",
    description: "Cards dinâmicos com as subcategorias da categoria atual.",
    icon: Tags,
  },
  {
    value: "CATEGORIA_PRODUTOS",
    label: "Produtos da categoria",
    description: "Vitrine dinâmica com produtos da categoria atual.",
    icon: Layers,
  },
  {
    value: "CATEGORIA_CTA",
    label: "CTA da categoria",
    description: "Chamada final dinâmica com botão e texto controlado.",
    icon: MousePointerClick,
  },
];

const GRUPOS_BLOCO = [
  { value: "TODOS", label: "Todos" },
  { value: "BASICOS", label: "Básicos" },
  { value: "LOJA", label: "Loja" },
  { value: "CATEGORIA", label: "Categoria" },
  { value: "CONVERSAO", label: "Conversão" },
];

const FONTES_PRODUTOS = [
  { value: "TODOS", label: "Todos os produtos" },
  { value: "CATEGORIA_ATUAL", label: "Categoria atual" },
  { value: "DESCONTOS", label: "Produtos com desconto" },
  { value: "NOVOS", label: "Produtos novos" },
  { value: "MAIS_VENDIDOS", label: "Mais vendidos" },
  { value: "CATEGORIA", label: "Uma categoria" },
  { value: "CATEGORIAS_SELECIONADAS", label: "Categorias selecionadas" },
  { value: "MANUAL", label: "Seleção manual por IDs" },
];

function getGrupoBloco(tipo: string) {
  if (
    tipo === "BANNER" ||
    tipo === "FAIXA_DIFERENCIAIS" ||
    tipo === "TEXTO" ||
    tipo === "IMAGEM_TEXTO"
  ) {
    return "BASICOS";
  }

  if (tipo === "PRODUTOS" || tipo === "RECOMENDACOES") {
    return "LOJA";
  }

  if (tipo.startsWith("CATEGORIA_")) {
    return "CATEGORIA";
  }

  if (tipo === "FAQ" || tipo === "FORMULARIO") {
    return "CONVERSAO";
  }

  return "BASICOS";
}

function normalizarBusca(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tipoBlocoLabel(tipo: string) {
  return TIPOS_BLOCO.find((item) => item.value === tipo)?.label || tipo;
}

function tipoBlocoIcon(tipo: string) {
  return TIPOS_BLOCO.find((item) => item.value === tipo)?.icon || Layers;
}

function ordenarPorOrdem(items: LojaPaginaBlocoItem[]) {
  return [...items].sort((a, b) => {
    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem;
    }

    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  });
}

function moverItem<T extends { id: string }>(
  items: T[],
  itemArrastadoId: string,
  itemDestinoId: string
) {
  const origemIndex = items.findIndex((item) => item.id === itemArrastadoId);
  const destinoIndex = items.findIndex((item) => item.id === itemDestinoId);

  if (origemIndex < 0 || destinoIndex < 0 || origemIndex === destinoIndex) {
    return items;
  }

  const novaLista = [...items];
  const [itemMovido] = novaLista.splice(origemIndex, 1);

  novaLista.splice(destinoIndex, 0, itemMovido);

  return novaLista;
}

async function lerRespostaApi(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return {};
  }
}

function asConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getString(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function getNumber(config: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number(config[key]);

  if (Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function getStringArray(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return [];
}

function getObject(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function setConfigValue(
  config: Record<string, unknown>,
  key: string,
  value: unknown
) {
  return {
    ...config,
    [key]: value,
  };
}

function setConfigObjectValue(
  config: Record<string, unknown>,
  objectKey: string,
  key: string,
  value: unknown
) {
  return {
    ...config,
    [objectKey]: {
      ...getObject(config, objectKey),
      [key]: value,
    },
  };
}

function removeArrayItem(items: string[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function updateArrayItem(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function toggleStringItem(items: string[], value: string) {
  if (items.includes(value)) {
    return items.filter((item) => item !== value);
  }

  return [...items, value];
}

function getTextoFundoClasses(fundo: string) {
  if (fundo === "AZUL_ESCURO") {
    return {
      container: "bg-[#2e7b99] text-white",
      titulo: "text-white",
      texto: "text-white/85",
    };
  }

  if (fundo === "AZUL_CLARO") {
    return {
      container: "bg-[var(--brand-blue-soft)] text-slate-950",
      titulo: "text-slate-950",
      texto: "text-slate-600",
    };
  }

  if (fundo === "ESCURO") {
    return {
      container: "bg-slate-950 text-white",
      titulo: "text-white",
      texto: "text-white/75",
    };
  }

  return {
    container: "bg-white text-slate-950",
    titulo: "text-slate-950",
    texto: "text-slate-600",
  };
}

function getEspacamentoClasses(espacamento: string) {
  if (espacamento === "PEQUENO") return "py-8";
  if (espacamento === "GRANDE") return "py-20";
  return "py-12";
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

function UploadImagemCampo({
  label,
  value,
  onChange,
  recomendacao,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  recomendacao?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [valorLocal, setValorLocal] = useState(value);

  useEffect(() => {
    setValorLocal(value);
  }, [value]);

  async function enviarImagem(file: File | null) {
    setErroUpload(null);

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("imagem", file);

      const response = await fetch("/api/configuracoes/loja/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErroUpload(
          data?.error || `Erro ao enviar imagem. Status: ${response.status}`
        );
        return;
      }

      if (typeof data?.url === "string") {
        setValorLocal(data.url);
        onChange(data.url);
        return;
      }

      setErroUpload("Upload concluído, mas a URL da imagem não foi retornada.");
    } catch (error) {
      console.error("Erro no upload pelo componente:", error);

      setErroUpload(
        error instanceof Error
          ? `Erro ao enviar imagem: ${error.message}`
          : "Erro ao enviar imagem."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-700">{label}</p>

        {recomendacao && (
          <p className="text-xs leading-5 text-slate-500">{recomendacao}</p>
        )}
      </div>

      <div className="grid gap-3">
        {valorLocal ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img
              src={valorLocal}
              alt={label}
              className="h-36 w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
            Sem imagem selecionada
          </div>
        )}

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Escolher arquivo"}

          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) =>
              void enviarImagem(event.target.files?.[0] ?? null)
            }
            className="hidden"
          />
        </label>

        <InputBase
          value={valorLocal}
          onChange={(event) => setValorLocal(event.target.value)}
          onBlur={() => onChange(valorLocal)}
          placeholder="/uploads/loja/imagem.jpg ou https://..."
        />

        {erroUpload && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erroUpload}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigBanner({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const imagemDesktop = getString(config, "imagemDesktop");
  const imagemMobile = getString(config, "imagemMobile");

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações do banner
      </p>

      <div className="mt-4 grid gap-4">
        <UploadImagemCampo
          label="Imagem desktop"
          value={imagemDesktop}
          recomendacao="Recomendado: 1920 x 640 px. Use imagens horizontais, com informações importantes centralizadas."
          onChange={(url) => onSave(setConfigValue(config, "imagemDesktop", url))}
        />

        <UploadImagemCampo
          label="Imagem mobile"
          value={imagemMobile}
          recomendacao="Recomendado: 1080 x 1350 px ou 900 x 1200 px. Use uma versão mais vertical e centralizada."
          onChange={(url) => onSave(setConfigValue(config, "imagemMobile", url))}
        />

        <LinkSugestoesInput
          label="Link do banner"
          value={getString(config, "linkUrl")}
          onChange={(value) => onSave(setConfigValue(config, "linkUrl", value))}
          placeholder="/loja/descontos"
          ajuda="Busque uma página, categoria, produto ou digite um link personalizado."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Altura desktop">
            <InputBase
              type="number"
              defaultValue={getNumber(config, "alturaDesktop", 520)}
              onBlur={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "alturaDesktop",
                    Number(event.target.value || 520)
                  )
                )
              }
            />
          </Campo>

          <Campo label="Altura mobile">
            <InputBase
              type="number"
              defaultValue={getNumber(config, "alturaMobile", 320)}
              onBlur={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "alturaMobile",
                    Number(event.target.value || 320)
                  )
                )
              }
            />
          </Campo>
        </div>
      </div>
    </div>
  );
}

function ConfigFaixaDiferenciais({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const itens = getStringArray(config, "itens");
  const lista =
    itens.length > 0 ? itens : ["Explore o catálogo", "Acompanhe seus pedidos"];

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações da faixa
      </p>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Cor de fundo">
            <InputBase
              type="color"
              defaultValue={getString(config, "corFundo", "#2e7b99")}
              onChange={(event) =>
                onSave(setConfigValue(config, "corFundo", event.target.value))
              }
              className="p-1"
            />
          </Campo>

          <Campo label="Cor do texto">
            <InputBase
              type="color"
              defaultValue={getString(config, "corTexto", "#ffffff")}
              onChange={(event) =>
                onSave(setConfigValue(config, "corTexto", event.target.value))
              }
              className="p-1"
            />
          </Campo>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Itens da faixa
          </p>

          <div className="space-y-2">
            {lista.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="grid grid-cols-[1fr_auto] gap-2"
              >
                <InputBase
                  defaultValue={item}
                  onBlur={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "itens",
                        updateArrayItem(lista, index, event.target.value)
                      )
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    onSave(
                      setConfigValue(
                        config,
                        "itens",
                        removeArrayItem(lista, index)
                      )
                    )
                  }
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onSave(setConfigValue(config, "itens", [...lista, "Novo item"]))
            }
            className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Adicionar item
          </button>
        </div>

        <div
          className="rounded-2xl px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em]"
          style={{
            backgroundColor: getString(config, "corFundo", "#2e7b99"),
            color: getString(config, "corTexto", "#ffffff"),
          }}
        >
          {lista.join(" • ")}
        </div>
      </div>
    </div>
  );
}

function ConfigTexto({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const fundo = getString(config, "fundo", "BRANCO");
  const espacamento = getString(config, "espacamento", "MEDIO");
  const preview = getTextoFundoClasses(fundo);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações de texto
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo", "Título da seção")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Texto de apoio">
          <TextareaBase
            rows={5}
            defaultValue={getString(config, "texto", "Texto de apoio da seção.")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "texto", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Alinhamento">
            <SelectBase
              defaultValue={getString(config, "alinhamento", "CENTRO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "alinhamento", event.target.value))
              }
            >
              <option value="ESQUERDA">Esquerda</option>
              <option value="CENTRO">Centro</option>
              <option value="DIREITA">Direita</option>
            </SelectBase>
          </Campo>

          <Campo label="Fundo">
            <SelectBase
              defaultValue={fundo}
              onChange={(event) =>
                onSave(setConfigValue(config, "fundo", event.target.value))
              }
            >
              <option value="BRANCO">Branco</option>
              <option value="AZUL_ESCURO">Azul escuro</option>
              <option value="AZUL_CLARO">Azul muito claro</option>
              <option value="ESCURO">Escuro</option>
            </SelectBase>
          </Campo>

          <Campo label="Espaçamento vertical">
            <SelectBase
              defaultValue={espacamento}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "espacamento", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </SelectBase>
          </Campo>
        </div>

        <div
          className={`rounded-2xl px-5 ${getEspacamentoClasses(
            espacamento
          )} ${preview.container}`}
        >
          <p className={`text-xl font-semibold ${preview.titulo}`}>
            {getString(config, "titulo", "Título da seção")}
          </p>

          <p className={`mt-3 text-sm leading-6 ${preview.texto}`}>
            {getString(config, "texto", "Texto de apoio da seção.")}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfigImagemTexto({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const imagemUrl = getString(config, "imagemUrl");

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações de imagem + texto
      </p>

      <div className="mt-4 grid gap-4">
        <UploadImagemCampo
          label="Imagem do bloco"
          value={imagemUrl}
          recomendacao="Recomendado: 1200 x 900 px para blocos equilibrados ou 1600 x 900 px para visual mais horizontal."
          onChange={(url) => onSave(setConfigValue(config, "imagemUrl", url))}
        />

        <Campo label="Posição da imagem">
          <SelectBase
            defaultValue={getString(config, "posicaoImagem", "ESQUERDA")}
            onChange={(event) =>
              onSave(
                setConfigValue(config, "posicaoImagem", event.target.value)
              )
            }
          >
            <option value="ESQUERDA">Imagem à esquerda</option>
            <option value="DIREITA">Imagem à direita</option>
          </SelectBase>
        </Campo>

        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo", "Título do bloco")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Texto">
          <TextareaBase
            rows={5}
            defaultValue={getString(config, "texto", "Texto do bloco.")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "texto", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Texto do botão">
            <InputBase
              defaultValue={getString(config, "textoBotao")}
              placeholder="Ex: Conhecer coleção"
              onBlur={(event) =>
                onSave(setConfigValue(config, "textoBotao", event.target.value))
              }
            />
          </Campo>

          <LinkSugestoesInput
            label="Link do botão"
            value={getString(config, "linkBotao")}
            onChange={(value) =>
              onSave(setConfigValue(config, "linkBotao", value))
            }
            placeholder="/loja/descontos"
            ajuda="Busque uma página, categoria, produto ou digite um link personalizado."
          />
        </div>

        <Campo label="Altura do bloco">
          <InputBase
            type="number"
            defaultValue={getNumber(config, "altura", 420)}
            onBlur={(event) =>
              onSave(
                setConfigValue(
                  config,
                  "altura",
                  Number(event.target.value || 420)
                )
              )
            }
          />
        </Campo>
      </div>
    </div>
  );
}

function ConfigProdutos({
  config,
  categoriasDisponiveis,
  onSave,
}: {
  config: Record<string, unknown>;
  categoriasDisponiveis: CategoriaBuilderOption[];
  onSave: (config: Record<string, unknown>) => void;
}) {
  const modo = getString(config, "modo", "CARROSSEL");
  const fonte = getString(config, "fonte", "TODOS");
  const categorias = getStringArray(config, "categorias");
  const produtosIds = getStringArray(config, "produtosIds");
  const filtros = getObject(config, "filtros");

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações de produtos
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Escolha se os produtos aparecem em carrossel ou em grade paginada.
        Depois, defina a fonte dos produtos, textos e filtros.
      </p>

      <div className="mt-4 grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cabeçalho maior
          </p>

          <div className="mt-4 grid gap-4">
            <Campo label="Título principal">
              <InputBase
                defaultValue={getString(config, "tituloPrincipal")}
                placeholder="Ex: Presentes para todos os momentos"
                onBlur={(event) =>
                  onSave(
                    setConfigValue(config, "tituloPrincipal", event.target.value)
                  )
                }
              />
            </Campo>

            <Campo label="Descrição principal">
              <TextareaBase
                rows={3}
                defaultValue={getString(config, "descricaoPrincipal")}
                placeholder="Texto introdutório maior para a seção."
                onBlur={(event) =>
                  onSave(
                    setConfigValue(
                      config,
                      "descricaoPrincipal",
                      event.target.value
                    )
                  )
                }
              />
            </Campo>

            <Campo label="Alinhamento do cabeçalho maior">
              <SelectBase
                defaultValue={getString(
                  config,
                  "alinhamentoPrincipal",
                  getString(config, "alinhamento", "CENTRO")
                )}
                onChange={(event) =>
                  onSave(
                    setConfigValue(
                      config,
                      "alinhamentoPrincipal",
                      event.target.value
                    )
                  )
                }
              >
                <option value="ESQUERDA">Esquerda</option>
                <option value="CENTRO">Centro</option>
                <option value="DIREITA">Direita</option>
              </SelectBase>
            </Campo>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cabeçalho da vitrine
          </p>

          <div className="mt-4 grid gap-4">
            <Campo label="Título da seção">
              <InputBase
                defaultValue={getString(config, "titulo", "Produtos")}
                onBlur={(event) =>
                  onSave(setConfigValue(config, "titulo", event.target.value))
                }
              />
            </Campo>

            <Campo label="Descrição da seção">
              <TextareaBase
                rows={3}
                defaultValue={getString(config, "descricao")}
                placeholder="Breve descrição antes dos produtos."
                onBlur={(event) =>
                  onSave(setConfigValue(config, "descricao", event.target.value))
                }
              />
            </Campo>

            <Campo label="Alinhamento dos textos da vitrine">
              <SelectBase
                defaultValue={getString(config, "alinhamento", "ESQUERDA")}
                onChange={(event) =>
                  onSave(
                    setConfigValue(config, "alinhamento", event.target.value)
                  )
                }
              >
                <option value="ESQUERDA">Esquerda</option>
                <option value="CENTRO">Centro</option>
                <option value="DIREITA">Direita</option>
              </SelectBase>
            </Campo>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Modo de exibição">
            <SelectBase
              defaultValue={modo}
              onChange={(event) =>
                onSave(setConfigValue(config, "modo", event.target.value))
              }
            >
              <option value="CARROSSEL">Carrossel</option>
              <option value="GRADE">Grade paginada</option>
            </SelectBase>
          </Campo>

          <Campo label="Fonte dos produtos">
            <SelectBase
              defaultValue={fonte}
              onChange={(event) =>
                onSave(setConfigValue(config, "fonte", event.target.value))
              }
            >
              {FONTES_PRODUTOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectBase>
          </Campo>
        </div>

        {(fonte === "CATEGORIA" || fonte === "CATEGORIAS_SELECIONADAS") && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-700">
              Categorias do bloco
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Para “Uma categoria”, selecione apenas uma. Para “Categorias
              selecionadas”, escolha quantas quiser.
            </p>

            <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
              {categoriasDisponiveis.map((categoria) => {
                const selecionada = categorias.includes(categoria.nome);

                return (
                  <label
                    key={categoria.id}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selecionada}
                      onChange={() => {
                        const novaLista =
                          fonte === "CATEGORIA"
                            ? selecionada
                              ? []
                              : [categoria.nome]
                            : toggleStringItem(categorias, categoria.nome);

                        onSave(setConfigValue(config, "categorias", novaLista));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />

                    <span>
                      <span className="block font-medium text-slate-800">
                        {categoria.nome}
                      </span>

                      <span className="block text-xs leading-5 text-slate-500">
                        {categoria.caminho}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {fonte === "MANUAL" && (
          <Campo label="IDs dos produtos">
            <TextareaBase
              rows={4}
              defaultValue={produtosIds.join("\n")}
              placeholder="Cole um ID de produto por linha"
              onBlur={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "produtosIds",
                    event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                )
              }
            />
          </Campo>
        )}

        {fonte === "CATEGORIA_ATUAL" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
            Este bloco usará automaticamente a categoria atual da página. É
            ideal para templates de categoria.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Limite de produtos">
            <InputBase
              type="number"
              min={1}
              defaultValue={getNumber(config, "limite", 12)}
              onBlur={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "limite",
                    Number(event.target.value || 12)
                  )
                )
              }
            />
          </Campo>

          {modo === "CARROSSEL" && (
            <Campo label="Mostrar setas">
              <SelectBase
                defaultValue={
                  getBoolean(config, "mostrarSetas", true) ? "SIM" : "NAO"
                }
                onChange={(event) =>
                  onSave(
                    setConfigValue(
                      config,
                      "mostrarSetas",
                      event.target.value === "SIM"
                    )
                  )
                }
              >
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </SelectBase>
            </Campo>
          )}
        </div>

        {modo === "GRADE" && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Campo label="Produtos por linha">
                <SelectBase
                  defaultValue={String(getNumber(config, "produtosPorLinha", 4))}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "produtosPorLinha",
                        Number(event.target.value)
                      )
                    )
                  }
                >
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </SelectBase>
              </Campo>

              <Campo label="Linhas por página">
                <SelectBase
                  defaultValue={String(getNumber(config, "linhasPorPagina", 2))}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "linhasPorPagina",
                        Number(event.target.value)
                      )
                    )
                  }
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </SelectBase>
              </Campo>

              <Campo label="Paginação">
                <SelectBase
                  defaultValue={getString(config, "paginacao", "NUMEROS")}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(config, "paginacao", event.target.value)
                    )
                  }
                >
                  <option value="NUMEROS">Números abaixo</option>
                  <option value="CARREGAR_MAIS">Carregar mais</option>
                </SelectBase>
              </Campo>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={getBoolean(config, "mostrarFiltros", false)}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "mostrarFiltros",
                        event.target.checked
                      )
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mostrar filtros na grade
              </label>

              {getBoolean(config, "mostrarFiltros", false) && (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {[
                    ["categoria", "Categoria"],
                    ["preco", "Preço"],
                    ["desconto", "Produtos com desconto"],
                    ["disponibilidade", "Disponibilidade"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(filtros[key])}
                        onChange={(event) =>
                          onSave(
                            setConfigObjectValue(
                              config,
                              "filtros",
                              key,
                              event.target.checked
                            )
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resumo da configuração
          </p>

          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <p>
              Modo:{" "}
              <span className="font-semibold text-slate-900">
                {modo === "GRADE" ? "Grade paginada" : "Carrossel"}
              </span>
            </p>

            <p>
              Fonte:{" "}
              <span className="font-semibold text-slate-900">
                {FONTES_PRODUTOS.find((item) => item.value === fonte)?.label ||
                  fonte}
              </span>
            </p>

            {categorias.length > 0 && (
              <p>
                Categorias:{" "}
                <span className="font-semibold text-slate-900">
                  {categorias.join(", ")}
                </span>
              </p>
            )}

            {modo === "GRADE" && (
              <p>
                Exibição:{" "}
                <span className="font-semibold text-slate-900">
                  {getNumber(config, "produtosPorLinha", 4)} por linha ×{" "}
                  {getNumber(config, "linhasPorPagina", 2)} linhas
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigCategoriaHero({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-950">
        Hero dinâmico da categoria
      </p>

      <p className="mt-1 text-xs leading-5 text-blue-800">
        Usa automaticamente nome, descrição e, opcionalmente, a imagem da
        categoria atual.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Texto pequeno acima do título">
          <InputBase
            defaultValue={getString(config, "textoEtiqueta", "Categoria")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "textoEtiqueta", event.target.value))
            }
          />
        </Campo>

        <Campo label="Título opcional">
          <InputBase
            defaultValue={getString(config, "titulo")}
            placeholder="Deixe vazio para usar o nome da categoria"
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Subtítulo opcional">
          <TextareaBase
            rows={3}
            defaultValue={getString(config, "subtitulo")}
            placeholder="Deixe vazio para usar a descrição da categoria"
            onBlur={(event) =>
              onSave(setConfigValue(config, "subtitulo", event.target.value))
            }
          />
        </Campo>

        <UploadImagemCampo
          label="Imagem/banner opcional do hero"
          value={getString(config, "imagemUrl")}
          recomendacao="Se preencher, esta imagem será usada como fundo do hero. Se deixar vazio, pode usar a imagem da categoria."
          onChange={(url) => onSave(setConfigValue(config, "imagemUrl", url))}
        />

        <label className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900">
          <input
            type="checkbox"
            checked={getBoolean(config, "usarImagemCategoria", false)}
            onChange={(event) =>
              onSave(
                setConfigValue(
                  config,
                  "usarImagemCategoria",
                  event.target.checked
                )
              )
            }
            className="mt-1 h-4 w-4 rounded border-blue-300"
          />

          <span>
            <strong className="block">Usar imagem da categoria</strong>
            <span className="mt-1 block text-xs leading-5 text-blue-800">
              Se não houver imagem específica acima, o bloco usa a imagem
              cadastrada na categoria.
            </span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Alinhamento">
            <SelectBase
              defaultValue={getString(config, "alinhamento", "CENTRO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "alinhamento", event.target.value))
              }
            >
              <option value="ESQUERDA">Esquerda</option>
              <option value="CENTRO">Centro</option>
              <option value="DIREITA">Direita</option>
            </SelectBase>
          </Campo>

          <Campo label="Fundo">
            <SelectBase
              defaultValue={getString(config, "fundo", "CLARO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "fundo", event.target.value))
              }
            >
              <option value="CLARO">Claro</option>
              <option value="AZUL_CLARO">Azul claro</option>
              <option value="AZUL_ESCURO">Azul escuro</option>
              <option value="ESCURO">Escuro</option>
            </SelectBase>
          </Campo>

          <Campo label="Tamanho do título">
            <SelectBase
              defaultValue={getString(config, "tamanhoTitulo", "GRANDE")}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "tamanhoTitulo", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
              <option value="IMPACTO">Impacto</option>
            </SelectBase>
          </Campo>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Espaçamento">
            <SelectBase
              defaultValue={getString(config, "espacamento", "GRANDE")}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "espacamento", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </SelectBase>
          </Campo>

          <Campo label="Largura">
            <SelectBase
              defaultValue={getString(config, "largura", "NORMAL")}
              onChange={(event) =>
                onSave(setConfigValue(config, "largura", event.target.value))
              }
            >
              <option value="ESTREITA">Estreita</option>
              <option value="NORMAL">Normal</option>
              <option value="LARGA">Larga</option>
              <option value="TOTAL">Total</option>
            </SelectBase>
          </Campo>
        </div>
      </div>
    </div>
  );
}

function ConfigCategoriaDescricao({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const fundo = getString(config, "fundo", "BRANCO");
  const preview = getTextoFundoClasses(fundo);

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-950">
        Descrição dinâmica da categoria
      </p>

      <p className="mt-1 text-xs leading-5 text-blue-800">
        Se título/texto ficarem vazios, o bloco usa automaticamente o nome e a
        descrição da categoria atual.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título opcional">
          <InputBase
            defaultValue={getString(config, "titulo")}
            placeholder="Ex: Sobre esta categoria"
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Texto opcional">
          <TextareaBase
            rows={4}
            defaultValue={getString(config, "texto")}
            placeholder="Deixe vazio para usar a descrição da categoria"
            onBlur={(event) =>
              onSave(setConfigValue(config, "texto", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Alinhamento">
            <SelectBase
              defaultValue={getString(config, "alinhamento", "CENTRO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "alinhamento", event.target.value))
              }
            >
              <option value="ESQUERDA">Esquerda</option>
              <option value="CENTRO">Centro</option>
              <option value="DIREITA">Direita</option>
            </SelectBase>
          </Campo>

          <Campo label="Fundo">
            <SelectBase
              defaultValue={fundo}
              onChange={(event) =>
                onSave(setConfigValue(config, "fundo", event.target.value))
              }
            >
              <option value="BRANCO">Branco</option>
              <option value="AZUL_CLARO">Azul claro</option>
              <option value="AZUL_ESCURO">Azul escuro</option>
              <option value="AZUL_ESCURO">Azul escuro</option>
              <option value="ESCURO">Escuro</option>
            </SelectBase>
          </Campo>

          <Campo label="Espaçamento">
            <SelectBase
              defaultValue={getString(config, "espacamento", "MEDIO")}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "espacamento", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </SelectBase>
          </Campo>
        </div>

        <div className={`rounded-2xl px-5 py-8 ${preview.container}`}>
          <p className={`text-xl font-semibold ${preview.titulo}`}>
            {getString(config, "titulo", "Sobre a categoria")}
          </p>

          <p className={`mt-3 text-sm leading-6 ${preview.texto}`}>
            {getString(
              config,
              "texto",
              "Quando publicado, este bloco pode usar a descrição cadastrada na categoria."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfigCategoriaSubcategorias({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-950">
        Subcategorias dinâmicas
      </p>

      <p className="mt-1 text-xs leading-5 text-blue-800">
        Exibe automaticamente as subcategorias da categoria atual em cards.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo", "Explore por categoria")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Descrição">
          <TextareaBase
            rows={3}
            defaultValue={getString(
              config,
              "descricao",
              "Veja as subcategorias disponíveis."
            )}
            onBlur={(event) =>
              onSave(setConfigValue(config, "descricao", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Colunas">
            <SelectBase
              defaultValue={String(getNumber(config, "colunas", 4))}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "colunas", Number(event.target.value))
                )
              }
            >
              <option value="2">2 colunas</option>
              <option value="3">3 colunas</option>
              <option value="4">4 colunas</option>
            </SelectBase>
          </Campo>

          <Campo label="Espaçamento">
            <SelectBase
              defaultValue={getString(config, "espacamento", "MEDIO")}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "espacamento", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </SelectBase>
          </Campo>
        </div>
      </div>
    </div>
  );
}

function ConfigCategoriaProdutos({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const modo = getString(config, "modo", "GRADE");
  const filtros = getObject(config, "filtros");

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-950">
        Produtos dinâmicos da categoria
      </p>

      <p className="mt-1 text-xs leading-5 text-blue-800">
        Exibe automaticamente os produtos da categoria atual. Ideal para
        templates de categoria.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título da vitrine">
          <InputBase
            defaultValue={getString(config, "titulo")}
            placeholder="Deixe vazio para usar “Produtos em [categoria]”"
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Descrição da vitrine">
          <TextareaBase
            rows={3}
            defaultValue={getString(config, "descricao")}
            placeholder="Texto opcional antes dos produtos"
            onBlur={(event) =>
              onSave(setConfigValue(config, "descricao", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Modo">
            <SelectBase
              defaultValue={modo}
              onChange={(event) =>
                onSave(setConfigValue(config, "modo", event.target.value))
              }
            >
              <option value="GRADE">Grade</option>
              <option value="CARROSSEL">Carrossel</option>
            </SelectBase>
          </Campo>

          <Campo label="Alinhamento">
            <SelectBase
              defaultValue={getString(config, "alinhamento", "ESQUERDA")}
              onChange={(event) =>
                onSave(setConfigValue(config, "alinhamento", event.target.value))
              }
            >
              <option value="ESQUERDA">Esquerda</option>
              <option value="CENTRO">Centro</option>
              <option value="DIREITA">Direita</option>
            </SelectBase>
          </Campo>

          <Campo label="Limite de produtos">
            <InputBase
              type="number"
              min={1}
              defaultValue={getNumber(config, "limite", 24)}
              onBlur={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "limite",
                    Number(event.target.value || 24)
                  )
                )
              }
            />
          </Campo>
        </div>

        {modo === "GRADE" && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Campo label="Produtos por linha">
                <SelectBase
                  defaultValue={String(getNumber(config, "produtosPorLinha", 4))}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "produtosPorLinha",
                        Number(event.target.value)
                      )
                    )
                  }
                >
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </SelectBase>
              </Campo>

              <Campo label="Linhas por página">
                <SelectBase
                  defaultValue={String(getNumber(config, "linhasPorPagina", 3))}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(
                        config,
                        "linhasPorPagina",
                        Number(event.target.value)
                      )
                    )
                  }
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </SelectBase>
              </Campo>

              <Campo label="Paginação">
                <SelectBase
                  defaultValue={getString(config, "paginacao", "CARREGAR_MAIS")}
                  onChange={(event) =>
                    onSave(
                      setConfigValue(config, "paginacao", event.target.value)
                    )
                  }
                >
                  <option value="NUMEROS">Números abaixo</option>
                  <option value="CARREGAR_MAIS">Carregar mais</option>
                </SelectBase>
              </Campo>
            </div>

            <label className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-900">
              <input
                type="checkbox"
                checked={getBoolean(config, "mostrarFiltros", true)}
                onChange={(event) =>
                  onSave(
                    setConfigValue(
                      config,
                      "mostrarFiltros",
                      event.target.checked
                    )
                  )
                }
                className="h-4 w-4 rounded border-blue-300"
              />
              Mostrar filtros
            </label>

            {getBoolean(config, "mostrarFiltros", true) && (
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                {[
                  ["categoria", "Categoria"],
                  ["preco", "Preço"],
                  ["desconto", "Produtos com desconto"],
                  ["disponibilidade", "Disponibilidade"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(filtros[key])}
                      onChange={(event) =>
                        onSave(
                          setConfigObjectValue(
                            config,
                            "filtros",
                            key,
                            event.target.checked
                          )
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {modo === "CARROSSEL" && (
          <Campo label="Mostrar setas">
            <SelectBase
              defaultValue={
                getBoolean(config, "mostrarSetas", true) ? "SIM" : "NAO"
              }
              onChange={(event) =>
                onSave(
                  setConfigValue(
                    config,
                    "mostrarSetas",
                    event.target.value === "SIM"
                  )
                )
              }
            >
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </SelectBase>
          </Campo>
        )}
      </div>
    </div>
  );
}

function ConfigCategoriaCTA({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-950">
        CTA dinâmico da categoria
      </p>

      <p className="mt-1 text-xs leading-5 text-blue-800">
        Chamada final com botão. Pode apontar para a própria categoria, carrinho,
        WhatsApp ou qualquer link sugerido.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo")}
            placeholder="Deixe vazio para usar título automático"
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Texto">
          <TextareaBase
            rows={3}
            defaultValue={getString(config, "texto")}
            placeholder="Texto de apoio do CTA"
            onBlur={(event) =>
              onSave(setConfigValue(config, "texto", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Texto do botão">
            <InputBase
              defaultValue={getString(config, "textoBotao", "Ver produtos")}
              onBlur={(event) =>
                onSave(setConfigValue(config, "textoBotao", event.target.value))
              }
            />
          </Campo>

          <LinkSugestoesInput
            label="Link do botão"
            value={getString(config, "linkBotao")}
            onChange={(value) =>
              onSave(setConfigValue(config, "linkBotao", value))
            }
            placeholder="Deixe vazio para usar a categoria atual"
            ajuda="Busque uma página, categoria, produto ou digite um link personalizado."
          />
        </div>

        <Campo label="Fundo">
          <SelectBase
            defaultValue={getString(config, "fundo", "AZUL_CLARO")}
            onChange={(event) =>
              onSave(setConfigValue(config, "fundo", event.target.value))
            }
          >
            <option value="BRANCO">Branco</option>
            <option value="AZUL_CLARO">Azul claro</option>
            <option value="AZUL_ESCURO">Azul escuro</option>
            <option value="ESCURO">Escuro</option>
          </SelectBase>
        </Campo>
      </div>
    </div>
  );
}

export default function PaginaBlocosClient({
  pagina,
  blocos,
  categoriasDisponiveis,
}: {
  pagina: LojaPaginaEditorItem;
  blocos: LojaPaginaBlocoItem[];
  categoriasDisponiveis: CategoriaBuilderOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const blocosOrdenadosInicial = useMemo(
    () => ordenarPorOrdem(blocos),
    [blocos]
  );

  const [blocosOrdenados, setBlocosOrdenados] = useState<LojaPaginaBlocoItem[]>(
    blocosOrdenadosInicial
  );

  const [blocoAbertoId, setBlocoAbertoId] = useState<string | null>(
    blocosOrdenadosInicial[0]?.id ?? null
  );

  const [blocoArrastandoId, setBlocoArrastandoId] = useState<string | null>(
    null
  );

  const [tipoSelecionado, setTipoSelecionado] = useState("BANNER");
  const [tituloBloco, setTituloBloco] = useState("");
  const [, setErro] = useState<string | null>(null);
  const [, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);

  const [buscaTipoBloco, setBuscaTipoBloco] = useState("");
  const [grupoTipoBloco, setGrupoTipoBloco] = useState("TODOS");
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);

  const tiposBlocoFiltrados = useMemo(() => {
    const termo = normalizarBusca(buscaTipoBloco);

    return TIPOS_BLOCO.filter((tipo) => {
      const grupo = getGrupoBloco(tipo.value);

      const combinaGrupo =
        grupoTipoBloco === "TODOS" || grupoTipoBloco === grupo;

      const combinaBusca =
        !termo ||
        normalizarBusca(tipo.label).includes(termo) ||
        normalizarBusca(tipo.description).includes(termo) ||
        normalizarBusca(tipo.value).includes(termo);

      return combinaGrupo && combinaBusca;
    });
  }, [buscaTipoBloco, grupoTipoBloco]);

  useEffect(() => {
    setBlocosOrdenados(blocosOrdenadosInicial);
  }, [blocosOrdenadosInicial]);

useEffect(() => {
  if (blocosOrdenados.length === 0) {
    setBlocoAbertoId(null);
    return;
  }

  if (!blocoAbertoId) {
    return;
  }

  const blocoAbertoAindaExiste = blocosOrdenados.some(
    (bloco) => bloco.id === blocoAbertoId
  );

  if (!blocoAbertoAindaExiste) {
    setBlocoAbertoId(null);
  }
}, [blocosOrdenados, blocoAbertoId]);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function atualizarBlocoLocal(
    blocoId: string,
    data: Partial<LojaPaginaBlocoItem>
  ) {
    setBlocosOrdenados((current) =>
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

  async function criarBloco() {
    setErro(null);
    setSucesso(null);

    if (salvando) return;

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
            tipo: tipoSelecionado,
            titulo: tituloBloco,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || data.message || "Erro ao criar bloco.");
        return;
      }

      if (data.bloco) {
        const novoBloco: LojaPaginaBlocoItem = {
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

        setBlocosOrdenados((current) =>
          ordenarPorOrdem([...current, novoBloco])
        );

        setBlocoAbertoId(novoBloco.id);
      }

      setTituloBloco("");
      setSucesso("Bloco criado com sucesso.");
      setModalAdicionarAberto(false);
      refresh();

    } catch (error) {
      console.error(error);
      setErro("Erro ao criar bloco.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarBloco(
    bloco: LojaPaginaBlocoItem,
    data: Partial<LojaPaginaBlocoItem>
  ) {
    setErro(null);
    setSucesso(null);

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

      const result = await response.json().catch(() => ({}));

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
    } catch (error) {
      console.error(error);
      atualizarBlocoLocal(bloco.id, blocoAnterior);
      setErro("Erro ao atualizar bloco.");
    }
  }

  async function salvarOrdemBlocos(novaLista: LojaPaginaBlocoItem[]) {
    setErro(null);
    setSucesso(null);
    setOrdemSalvando(true);

    const listaAnterior = [...blocosOrdenados];

    setBlocosOrdenados(novaLista);

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
        setErro("Erro ao salvar ordem dos blocos.");
        setBlocosOrdenados(listaAnterior);
        return;
      }

      setSucesso("Ordem dos blocos atualizada.");
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar ordem dos blocos.");
      setBlocosOrdenados(listaAnterior);
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

  async function reordenarBloco(destinoId: string) {
    if (!blocoArrastandoId || ordemSalvando) return;

    const novaLista = moverItem(
      blocosOrdenados,
      blocoArrastandoId,
      destinoId
    ).map((bloco, index) => ({
      ...bloco,
      ordem: index,
    }));

    setBlocoArrastandoId(null);
    setBlocosOrdenados(novaLista);

    await salvarOrdemBlocos(novaLista);
  }

  async function excluirBloco(bloco: LojaPaginaBlocoItem) {
    const confirmado = window.confirm(
      `Excluir o bloco ${bloco.titulo || tipoBlocoLabel(bloco.tipo)}?`
    );

    if (!confirmado) return;

    setErro(null);
    setSucesso(null);

    const listaAnterior = [...blocosOrdenados];

    setBlocosOrdenados((current) =>
      current.filter((item) => item.id !== bloco.id)
    );

    try {
      const response = await fetch(
        `/api/configuracoes/loja/paginas/${pagina.id}/blocos/${bloco.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setBlocosOrdenados(listaAnterior);
        setErro(data.error || data.message || "Erro ao excluir bloco.");
        return;
      }

      setSucesso("Bloco excluído.");
    } catch (error) {
      console.error(error);
      setBlocosOrdenados(listaAnterior);
      setErro("Erro ao excluir bloco.");
    }
  }

  function salvarConfigBloco(
    bloco: LojaPaginaBlocoItem,
    configJson: Record<string, unknown>
  ) {
    atualizarBlocoLocal(bloco.id, {
      configJson,
    });

    void atualizarBloco(
      {
        ...bloco,
        configJson,
      },
      {
        configJson,
      }
    );
  }

  function renderConfigBloco(bloco: LojaPaginaBlocoItem) {
    const config = asConfig(bloco.configJson);

    if (bloco.tipo === "BANNER") {
      return (
        <ConfigBanner
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "FAIXA_DIFERENCIAIS") {
      return (
        <ConfigFaixaDiferenciais
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "TEXTO") {
      return (
        <ConfigTexto
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "IMAGEM_TEXTO") {
      return (
        <ConfigImagemTexto
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "PRODUTOS" || bloco.tipo === "RECOMENDACOES") {
      return (
        <ConfigProdutos
          config={config}
          categoriasDisponiveis={categoriasDisponiveis}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "FAQ") {
      return (
        <ConfigFaqBloco
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "FORMULARIO") {
      return (
        <ConfigFormularioBloco
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "CATEGORIA_HERO") {
      return (
        <ConfigCategoriaHero
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "CATEGORIA_DESCRICAO") {
      return (
        <ConfigCategoriaDescricao
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "CATEGORIA_SUBCATEGORIAS") {
      return (
        <ConfigCategoriaSubcategorias
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "CATEGORIA_PRODUTOS") {
      return (
        <ConfigCategoriaProdutos
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    if (bloco.tipo === "CATEGORIA_CTA") {
      return (
        <ConfigCategoriaCTA
          config={config}
          onSave={(configAtualizada) =>
            salvarConfigBloco(bloco, configAtualizada)
          }
        />
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Blocos da página
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Organize, edite, ative ou recolha os blocos desta página.
      </p>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setModalAdicionarAberto(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Adicionar bloco
      </button>

      <button
        type="button"
        onClick={() => setBlocoAbertoId(null)}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Recolher todos
      </button>
    </div>
  </div>
</div>

        {blocosOrdenados.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">
            Nenhum bloco cadastrado nesta página.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blocosOrdenados.map((bloco) => {
              const Icon = tipoBlocoIcon(bloco.tipo);
              const blocoAberto = blocoAbertoId === bloco.id;
              const configResumo = asConfig(bloco.configJson);
              const blocoCategoria = bloco.tipo.startsWith("CATEGORIA_");

              return (
                <div
                  key={bloco.id}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setBlocoArrastandoId(bloco.id);
                  }}
                  onDragEnd={(event) => {
                    event.stopPropagation();
                    setBlocoArrastandoId(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void reordenarBloco(bloco.id);
                  }}
                  className={`cursor-grab px-5 py-4 transition active:cursor-grabbing ${
                    blocoArrastandoId === bloco.id ? "bg-slate-50 opacity-60" : "bg-white"
                  }`}
                >
                  <div className="grid gap-4 lg:grid-cols-[32px_1fr]">
                    <div className="flex items-start justify-center pt-2 text-slate-300">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">
                                {bloco.titulo || tipoBlocoLabel(bloco.tipo)}
                              </p>

                              <p className="text-xs text-slate-500">
                                {tipoBlocoLabel(bloco.tipo)} · ordem {bloco.ordem}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <input
                              defaultValue={bloco.titulo ?? ""}
                              onBlur={(event) =>
                                atualizarBloco(bloco, {
                                  titulo: event.target.value,
                                })
                              }
                              placeholder="Título interno do bloco"
                              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            {bloco.tipo === "FAQ" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                {Array.isArray(configResumo.itens)
                                  ? `${configResumo.itens.length} pergunta${
                                      configResumo.itens.length === 1 ? "" : "s"
                                    }`
                                  : "FAQ"}
                              </span>
                            )}

                            {bloco.tipo === "PRODUTOS" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Fonte: {String(configResumo.fonte || "TODOS")}
                              </span>
                            )}

                            {bloco.tipo === "RECOMENDACOES" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Recomendações
                              </span>
                            )}

                            {bloco.tipo === "FORMULARIO" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Formulário
                              </span>
                            )}

                            {blocoCategoria && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                Dinâmico de categoria
                              </span>
                            )}

                            {typeof configResumo.fundo === "string" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Fundo: {configResumo.fundo}
                              </span>
                            )}

                            {typeof configResumo.modo === "string" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Modo: {configResumo.modo}
                              </span>
                            )}

                            {typeof configResumo.alinhamento === "string" && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                Alinhamento: {configResumo.alinhamento}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-start gap-2 xl:justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              atualizarBloco(bloco, {
                                ativo: !bloco.ativo,
                              })
                            }
                            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${
                              bloco.ativo
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {bloco.ativo ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                            {bloco.ativo ? "Ativo" : "Inativo"}
                          </button>

                          <button
                            type="button"
                            disabled={ordemSalvando}
                            onClick={() => void moverBlocoPorSeta(bloco.id, "CIMA")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Mover para cima"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            disabled={ordemSalvando}
                            onClick={() => void moverBlocoPorSeta(bloco.id, "BAIXO")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            draggable={false}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void excluirBloco(bloco);
                            }}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setBlocoAbertoId((current) =>
                              current === bloco.id ? null : bloco.id
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {blocoAberto ? "Recolher configurações" : "Editar configurações"}

                          <ChevronDown
                            className={`h-4 w-4 transition ${
                              blocoAberto ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {blocoAberto && (
                          <span className="text-xs font-medium text-slate-400">
                            As configurações abertas ocupam toda a largura do bloco.
                          </span>
                        )}
                      </div>

                      {blocoAberto && (
                        <div className="mt-4 w-full">
                          {renderConfigBloco(bloco)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {modalAdicionarAberto && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Builder
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Adicionar bloco
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Escolha um tipo de bloco para adicionar à página.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAdicionarAberto(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        {pagina.tipo === "TEMPLATE_CATEGORIA" || pagina.tipo === "CATEGORIA" ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
            Esta página aceita blocos dinâmicos de categoria.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            Blocos de categoria só terão conteúdo em páginas do tipo categoria
            ou template de categoria.
          </div>
        )}

        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={buscaTipoBloco}
              onChange={(event) => setBuscaTipoBloco(event.target.value)}
              placeholder="Buscar bloco..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-slate-400"
            />

            {buscaTipoBloco && (
              <button
                type="button"
                onClick={() => setBuscaTipoBloco("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {GRUPOS_BLOCO.map((grupo) => (
              <button
                key={grupo.value}
                type="button"
                onClick={() => setGrupoTipoBloco(grupo.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  grupoTipoBloco === grupo.value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {grupo.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {tiposBlocoFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 md:col-span-2">
                Nenhum bloco encontrado.
              </div>
            ) : (
              tiposBlocoFiltrados.map((tipo) => {
                const Icon = tipo.icon;
                const selecionado = tipoSelecionado === tipo.value;
                const blocoCategoria = tipo.value.startsWith("CATEGORIA_");

                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setTipoSelecionado(tipo.value)}
                    className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                      selecionado
                        ? "border-slate-950 bg-slate-950 text-white"
                        : blocoCategoria
                        ? "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        selecionado
                          ? "text-white"
                          : blocoCategoria
                          ? "text-blue-500"
                          : "text-slate-400"
                      }`}
                    />

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {tipo.label}
                      </span>

                      <span
                        className={`mt-0.5 line-clamp-2 block text-xs leading-5 ${
                          selecionado ? "text-slate-200" : "opacity-75"
                        }`}
                      >
                        {tipo.description}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Título interno opcional
            </span>

            <input
              value={tituloBloco}
              onChange={(event) => setTituloBloco(event.target.value)}
              placeholder="Ex: FAQ principal, Produtos da categoria..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setModalAdicionarAberto(false)}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={criarBloco}
            disabled={salvando || isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {salvando ? "Criando..." : "Adicionar bloco"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
    
  );
}
