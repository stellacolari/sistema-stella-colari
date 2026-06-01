"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Layers,
  LayoutGrid,
  Monitor,
  MousePointer2,
  PanelRight,
  Plus,
  Rows3,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
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

type TipoBlocoAdicionar =
  | "BANNER"
  | "TEXTO_IMAGEM"
  | "LISTA_PRODUTOS"
  | "CATEGORIAS"
  | "FAQ"
  | "FORMULARIO"
  | "TEXTO"
  | "ESPACADOR";

type BlocoEditandoState = {
  bloco: EditorVisualBloco;
  nomeInterno: string;
  titulo: string;
  texto: string;
  imagemUrl: string;
  imagemDesktopUrl: string;
  imagemMobileUrl: string;
  videoDesktopUrl: string;
  videoMobileUrl: string;
  videoPosterUrl: string;
  videoLoop: boolean;
  videoSom: string;
  textoBotao: string;
  textoBotaoSecundario: string;
  linkBotao: string;
  linkBotaoSecundario: string;
  corFundo: string;
  espacamento: string;
  alinhamentoConteudo: string;
  alturaBanner: string;
  overlayBanner: string;
  corTextoBanner: string;
  tipoMidia: string;
  exibirTexto: boolean;
  exibirSubtitulo: boolean;
  exibirBotaoPrimario: boolean;
  exibirBotaoSecundario: boolean;
} | null;

type MediaKind = "IMAGEM" | "VIDEO";

const COR_FUNDO_PRESETS = [
  { value: "BRANCO", label: "Branco" },
  { value: "CINZA", label: "Cinza claro" },
  { value: "MARCA", label: "Azul marca" },
  { value: "ESCURO", label: "Escuro" },
];

const ESPACAMENTO_PRESETS = [
  { value: "COMPACTO", label: "Compacto" },
  { value: "PADRAO", label: "Padrão" },
  { value: "AMPLO", label: "Amplo" },
];

const ALINHAMENTO_BANNER_PRESETS = [
  { value: "ESQUERDA", label: "Esquerda" },
  { value: "CENTRO", label: "Centro" },
  { value: "DIREITA", label: "Direita" },
];

const ALTURA_BANNER_PRESETS = [
  { value: "COMPACTA", label: "Compacta" },
  { value: "PADRAO", label: "Padrão" },
  { value: "TELA_CHEIA", label: "Tela cheia" },
];

const OVERLAY_BANNER_PRESETS = [
  { value: "NENHUM", label: "Nenhum" },
  { value: "LEVE", label: "Leve" },
  { value: "MEDIO", label: "Médio" },
];

const COR_TEXTO_BANNER_PRESETS = [
  { value: "CLARO", label: "Claro" },
  { value: "ESCURO", label: "Escuro" },
];

const TIPO_MIDIA_BANNER_PRESETS = [
  { value: "IMAGEM", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
];

const VIDEO_SOM_PRESETS = [
  { value: "MUDO", label: "Mudo" },
  { value: "COM_SOM", label: "Com som" },
];

const MAX_IMAGEM_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPT_IMAGEM_UPLOAD = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ACCEPT_VIDEO_UPLOAD = ".mp4,.webm,video/mp4,video/webm";

const TIPOS_BLOCO_ADICIONAR: {
  tipo: TipoBlocoAdicionar;
  nome: string;
  descricao: string;
  tituloInicial: string;
  icon: LucideIcon;
}[] = [
  {
    tipo: "BANNER",
    nome: "Banner",
    descricao: "Imagem de destaque com título, texto de apoio e botão.",
    tituloInicial: "Novo banner",
    icon: ImageIcon,
  },
  {
    tipo: "TEXTO_IMAGEM",
    nome: "Texto + imagem",
    descricao: "Bloco editorial com imagem, texto e chamada para ação.",
    tituloInicial: "Texto + imagem",
    icon: ImageIcon,
  },
  {
    tipo: "LISTA_PRODUTOS",
    nome: "Lista de produtos",
    descricao: "Vitrine visual para organizar produtos em grade simulada.",
    tituloInicial: "Lista de produtos",
    icon: Layers,
  },
  {
    tipo: "CATEGORIAS",
    nome: "Categorias",
    descricao: "Grade visual para destacar categorias da loja.",
    tituloInicial: "Categorias",
    icon: LayoutGrid,
  },
  {
    tipo: "FAQ",
    nome: "FAQ",
    descricao: "Perguntas frequentes em lista simples nesta etapa.",
    tituloInicial: "FAQ",
    icon: HelpCircle,
  },
  {
    tipo: "FORMULARIO",
    nome: "Formulário",
    descricao: "Bloco para captação de contato ou interesse.",
    tituloInicial: "Formulário",
    icon: ClipboardList,
  },
  {
    tipo: "TEXTO",
    nome: "Texto",
    descricao: "Título e conteúdo textual básico.",
    tituloInicial: "Texto",
    icon: Type,
  },
  {
    tipo: "ESPACADOR",
    nome: "Espaçador",
    descricao: "Área de respiro entre seções da página.",
    tituloInicial: "Espaçador",
    icon: Rows3,
  },
];

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

function getBooleanConfig(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
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
  if (tipo === "ESPACADOR") return "Espaçador";

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

function isBannerTipo(tipo: string) {
  return tipo === "BANNER" || tipo === "HERO";
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

function getDeviceDescription(device: DevicePreview) {
  if (device === "MOBILE") {
    return "Ajustes mobile serão separados nas próximas etapas. Por enquanto, estes campos continuam salvando o conteúdo base do bloco.";
  }

  if (device === "TABLET") {
    return "Ajustes tablet serão separados nas próximas etapas. Por enquanto, estes campos continuam salvando o conteúdo base do bloco.";
  }

  return "Ajustes gerais e desktop. As alterações abaixo atualizam o conteúdo base usado no preview.";
}

function getBgClass(corFundo: string) {
  if (corFundo === "CINZA") return "bg-slate-50";
  if (corFundo === "MARCA") return "bg-[var(--brand-blue-soft)]";
  if (corFundo === "ESCURO") return "bg-slate-950 text-white";

  return "bg-white";
}

function getPaddingClass(espacamento: string) {
  if (espacamento === "COMPACTO") return "px-6 py-6";
  if (espacamento === "AMPLO") return "px-6 py-16";

  return "px-6 py-10";
}

function getBannerHeightClass(altura: string, isMobile: boolean) {
  if (altura === "COMPACTA") {
    return isMobile ? "h-[360px]" : "h-[320px]";
  }

  if (altura === "TELA_CHEIA") {
    return isMobile ? "h-[640px]" : "h-[720px]";
  }

  return isMobile ? "h-[520px]" : "h-[420px]";
}

function getBannerAlignmentClass(alinhamento: string, isMobile: boolean) {
  if (alinhamento === "CENTRO") {
    return "justify-center px-6 text-center";
  }

  if (alinhamento === "DIREITA") {
    return isMobile
      ? "justify-center px-6 text-center"
      : "justify-end px-12 text-right";
  }

  return isMobile ? "justify-center px-6 text-center" : "justify-start px-12";
}

function getBannerOverlayClass(overlay: string) {
  if (overlay === "MEDIO") return "bg-black/45";
  if (overlay === "LEVE") return "bg-black/20";

  return "bg-transparent";
}

function getBannerTextClasses(corTexto: string) {
  if (corTexto === "ESCURO") {
    return {
      eyebrow: "text-slate-700",
      title: "text-slate-950",
      text: "text-slate-700",
      button: "bg-slate-950 text-white",
    };
  }

  return {
    eyebrow: "text-white/70",
    title: "text-white",
    text: "text-white/80",
    button: "bg-white text-slate-950",
  };
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

function PainelSecao({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>

      <div className="mt-3">{children}</div>
    </section>
  );
}

function formatarTamanhoMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function validarArquivoMidia(file: File, tipoMidia: MediaKind) {
  if (tipoMidia === "IMAGEM") {
    const tiposValidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposValidos.includes(file.type)) {
      return "Use uma imagem JPG, PNG ou WebP.";
    }

    if (file.size > MAX_IMAGEM_UPLOAD_BYTES) {
      return "A imagem deve ter no máximo 4 MB.";
    }

    return "";
  }

  const tiposValidos = ["video/mp4", "video/webm"];

  if (!tiposValidos.includes(file.type)) {
    return "Use um vídeo MP4 ou WebM. Recomendado: MP4/H.264.";
  }

  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return "O vídeo deve ter no máximo 15 MB.";
  }

  return "";
}

function CampoToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>

        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function UploadMidiaCampo({
  label,
  value,
  tipoMidia,
  onChange,
  orientacao,
}: {
  label: string;
  value: string;
  tipoMidia: MediaKind;
  onChange: (url: string) => void;
  orientacao: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const accept =
    tipoMidia === "IMAGEM" ? ACCEPT_IMAGEM_UPLOAD : ACCEPT_VIDEO_UPLOAD;

  async function enviarArquivo(file: File | null) {
    setErro("");

    if (!file) return;

    const erroValidacao = validarArquivoMidia(file, tipoMidia);

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      formData.append("tipoMidia", tipoMidia);

      const response = await fetch("/api/configuracoes/loja/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || data.erro || "Erro ao enviar arquivo.");
        return;
      }

      if (typeof data.url !== "string" || !data.url) {
        setErro("Upload concluído, mas a URL do arquivo não foi retornada.");
        return;
      }

      onChange(data.url);
    } catch {
      setErro("Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void enviarArquivo(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    void enviarArquivo(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{orientacao}</p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed p-4 transition ${
          arrastando
            ? "border-indigo-300 bg-indigo-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        {value ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {tipoMidia === "VIDEO" ? (
              <video src={value} className="h-36 w-full object-cover" controls />
            ) : (
              <img src={value} alt={label} className="h-36 w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="mb-3 flex h-28 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 ring-1 ring-slate-200">
            Arraste um arquivo aqui
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {enviando ? "Enviando..." : "Selecionar arquivo"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            disabled={enviando}
            className="hidden"
          />

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Cole ou digite uma URL"
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          />

          <p className="text-xs leading-5 text-slate-500">
            {tipoMidia === "VIDEO"
              ? `MP4/H.264 recomendado. Limite: ${formatarTamanhoMb(
                  MAX_VIDEO_UPLOAD_BYTES
                )}.`
              : `JPG, PNG ou WebP. Limite: ${formatarTamanhoMb(
                  MAX_IMAGEM_UPLOAD_BYTES
                )}.`}
          </p>
        </div>

        {erro && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}
      </div>
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

  const imagemDesktopUrl =
    getStringConfig(config, "imagemDesktopUrl") ||
    getStringConfig(config, "imagemDesktop") ||
    imagemUrl;

  const imagemMobileUrl =
    getStringConfig(config, "imagemMobileUrl") ||
    getStringConfig(config, "imagemMobile");

  const textoBotao =
    getStringConfig(config, "textoBotao") ||
    getStringConfig(config, "botaoTexto") ||
    "Conhecer";

  const textoBotaoSecundario =
    getStringConfig(config, "textoBotaoSecundario") ||
    getStringConfig(config, "botaoSecundarioTexto");

  const corFundo = getStringConfig(config, "corFundo") || "BRANCO";
  const espacamento = getStringConfig(config, "espacamento") || "PADRAO";

  const categorias = getArrayConfig(config, "categorias");
  const produtos = getArrayConfig(config, "produtos");

  const isMobile = device === "MOBILE";
  const bgClass = getBgClass(corFundo);
  const paddingClass = getPaddingClass(espacamento);
  const alinhamentoBanner =
    getStringConfig(config, "alinhamentoConteudo") || "ESQUERDA";
  const alturaBanner = getStringConfig(config, "alturaBanner") || "PADRAO";
  const overlayBanner = getStringConfig(config, "overlayBanner") || "LEVE";
  const corTextoBanner = getStringConfig(config, "corTextoBanner") || "CLARO";
  const tipoMidia = getStringConfig(config, "tipoMidia") || "IMAGEM";
  const videoDesktopUrl = getStringConfig(config, "videoDesktopUrl");
  const videoMobileUrl = getStringConfig(config, "videoMobileUrl");
  const videoPosterUrl = getStringConfig(config, "videoPosterUrl");
  const videoLoop = getBooleanConfig(config, "videoLoop", true);
  const videoSom = getStringConfig(config, "videoSom") || "MUDO";
  const exibirTexto = getBooleanConfig(config, "exibirTexto", true);
  const exibirSubtitulo = getBooleanConfig(config, "exibirSubtitulo", true);
  const exibirBotaoPrimario = getBooleanConfig(
    config,
    "exibirBotaoPrimario",
    true
  );
  const exibirBotaoSecundario = getBooleanConfig(
    config,
    "exibirBotaoSecundario",
    false
  );
  const imagemBannerUrl =
    isMobile && imagemMobileUrl ? imagemMobileUrl : imagemDesktopUrl;
  const videoBannerUrl =
    isMobile && videoMobileUrl ? videoMobileUrl : videoDesktopUrl;
  const bannerTextClasses = getBannerTextClasses(corTextoBanner);
  const usarVideoBanner = tipoMidia === "VIDEO" && Boolean(videoBannerUrl);

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

      {isBannerTipo(bloco.tipo) ? (
        <div
          className={`relative overflow-hidden bg-slate-900 ${getBannerHeightClass(
            alturaBanner,
            isMobile
          )}`}
        >
          {usarVideoBanner ? (
            <video
              src={videoBannerUrl}
              poster={videoPosterUrl || undefined}
              autoPlay
              loop={videoLoop}
              muted={videoSom === "MUDO"}
              playsInline
              className="h-full w-full object-cover"
            />
          ) : imagemBannerUrl ? (
            <img
              src={imagemBannerUrl}
              alt={titulo}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-medium text-slate-500">
              Banner sem imagem
            </div>
          )}

          <div className={`absolute inset-0 ${getBannerOverlayClass(overlayBanner)}`} />

          {exibirTexto && (
            <div
              className={`absolute inset-0 flex items-center ${getBannerAlignmentClass(
                alinhamentoBanner,
                isMobile
              )}`}
            >
              <div className={isMobile ? "max-w-sm" : "max-w-xl"}>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.22em] ${bannerTextClasses.eyebrow}`}
                >
                  Stella
                </p>

                <h2
                  className={`mt-3 font-light tracking-tight ${bannerTextClasses.title} ${
                    isMobile ? "text-4xl" : "text-5xl"
                  }`}
                >
                  {titulo}
                </h2>

                {exibirSubtitulo && texto && (
                  <p
                    className={`mt-4 text-sm leading-6 ${bannerTextClasses.text}`}
                  >
                    {texto}
                  </p>
                )}

                {(exibirBotaoPrimario || exibirBotaoSecundario) && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {exibirBotaoPrimario && textoBotao && (
                      <div
                        className={`inline-flex px-5 py-3 text-sm font-semibold ${bannerTextClasses.button}`}
                      >
                        {textoBotao}
                      </div>
                    )}

                    {exibirBotaoSecundario && textoBotaoSecundario && (
                      <div
                        className={`inline-flex border px-5 py-3 text-sm font-semibold ${
                          corTextoBanner === "ESCURO"
                            ? "border-slate-950 text-slate-950"
                            : "border-white text-white"
                        }`}
                      >
                        {textoBotaoSecundario}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : bloco.tipo === "ESPACADOR" ? (
        <div className="flex h-16 items-center justify-center bg-slate-50">
          <div className="h-px w-24 bg-slate-200" />
        </div>
      ) : bloco.tipo === "TEXTO_IMAGEM" ? (
        <div
          className={`grid ${bgClass} ${
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

          <div className={`flex items-center ${paddingClass}`}>
            <div>
              <h2 className="text-3xl font-light tracking-tight">{titulo}</h2>

              <p
                className={`mt-4 text-sm leading-7 ${
                  corFundo === "ESCURO" ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {texto || "Texto do bloco aparece aqui."}
              </p>

              {textoBotao && (
                <div
                  className={`mt-5 inline-flex px-5 py-3 text-sm font-semibold ${
                    corFundo === "ESCURO"
                      ? "bg-white text-slate-950"
                      : "bg-slate-950 text-white"
                  }`}
                >
                  {textoBotao}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : bloco.tipo.includes("PRODUTO") ? (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          {texto && (
            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {texto}
            </p>
          )}

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
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          {texto && (
            <p
              className={`mt-2 max-w-2xl text-sm leading-6 ${
                corFundo === "ESCURO" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {texto}
            </p>
          )}

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
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-slate-200 bg-white px-4 py-4">
                <div className="h-3 w-2/3 bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${bgClass} ${paddingClass}`}>
          <h2 className="text-2xl font-light tracking-tight">{titulo}</h2>

          <p
            className={`mt-4 max-w-2xl text-sm leading-7 ${
              corFundo === "ESCURO" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {texto || "Conteúdo do bloco será exibido aqui."}
          </p>
        </div>
      )}
    </section>
  );
}

function EditorConteudoBlocoModal({
  estado,
  onChange,
  onClose,
  onSave,
  salvando,
}: {
  estado: BlocoEditandoState;
  onChange: (data: Partial<NonNullable<BlocoEditandoState>>) => void;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
}) {
  if (!estado) {
    return null;
  }

  const isBanner = isBannerTipo(estado.bloco.tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Editar bloco
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {estado.nomeInterno || getTipoLabel(estado.bloco.tipo)}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isBanner
                ? "Configure conteúdo, imagens e aparência do banner no preview visual."
                : "Primeira edição visual com campos universais. Depois vamos especializar por tipo de bloco."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Fechar edição"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isBanner ? (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Banner principal"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <CampoToggle
                checked={estado.exibirTexto}
                label="Exibir texto"
                description="Controla título, subtítulo e botões do banner."
                onChange={(checked) => onChange({ exibirTexto: checked })}
              />

              <CampoToggle
                checked={estado.exibirSubtitulo}
                label="Exibir subtítulo"
                onChange={(checked) => onChange({ exibirSubtitulo: checked })}
              />

              <CampoToggle
                checked={estado.exibirBotaoPrimario}
                label="Exibir botão primário"
                onChange={(checked) =>
                  onChange({ exibirBotaoPrimario: checked })
                }
              />

              <CampoToggle
                checked={estado.exibirBotaoSecundario}
                label="Exibir botão secundário"
                onChange={(checked) =>
                  onChange({ exibirBotaoSecundario: checked })
                }
              />
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Título
              </span>

              <input
                value={estado.titulo}
                onChange={(event) => onChange({ titulo: event.target.value })}
                placeholder="Título visível"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Subtítulo/texto
              </span>

              <textarea
                value={estado.texto}
                onChange={(event) => onChange({ texto: event.target.value })}
                rows={4}
                placeholder="Texto de apoio do banner"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tipo de mídia
              </span>

              <select
                value={estado.tipoMidia}
                onChange={(event) => onChange({ tipoMidia: event.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              >
                {TIPO_MIDIA_BANNER_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            {estado.tipoMidia === "VIDEO" ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <UploadMidiaCampo
                    label="Vídeo desktop URL"
                    value={estado.videoDesktopUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoDesktopUrl: url })}
                    orientacao="Cole uma URL ou envie um arquivo MP4/WebM. MP4/H.264 é recomendado para compatibilidade."
                  />

                  <UploadMidiaCampo
                    label="Vídeo mobile URL"
                    value={estado.videoMobileUrl}
                    tipoMidia="VIDEO"
                    onChange={(url) => onChange({ videoMobileUrl: url })}
                    orientacao="Opcional. Quando vazio, o preview mobile usa o vídeo desktop."
                  />
                </div>

                <UploadMidiaCampo
                  label="Poster do vídeo URL"
                  value={estado.videoPosterUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ videoPosterUrl: url })}
                  orientacao="Imagem exibida enquanto o vídeo carrega. JPG, PNG ou WebP."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <CampoToggle
                    checked={estado.videoLoop}
                    label="Repetir vídeo em loop"
                    onChange={(checked) => onChange({ videoLoop: checked })}
                  />

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Som do vídeo
                    </span>

                    <select
                      value={estado.videoSom}
                      onChange={(event) =>
                        onChange({ videoSom: event.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                    >
                      {VIDEO_SOM_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <UploadMidiaCampo
                  label="Imagem desktop URL"
                  value={estado.imagemDesktopUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemDesktopUrl: url })}
                  orientacao="Cole uma URL ou envie JPG, PNG ou WebP."
                />

                <UploadMidiaCampo
                  label="Imagem mobile URL"
                  value={estado.imagemMobileUrl}
                  tipoMidia="IMAGEM"
                  onChange={(url) => onChange({ imagemMobileUrl: url })}
                  orientacao="Opcional. Quando vazio, o preview mobile usa a imagem desktop."
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão
                </span>

                <input
                  value={estado.textoBotao}
                  onChange={(event) =>
                    onChange({ textoBotao: event.target.value })
                  }
                  placeholder="Ex: Comprar agora"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão
                </span>

                <input
                  value={estado.linkBotao}
                  onChange={(event) =>
                    onChange({ linkBotao: event.target.value })
                  }
                  placeholder="/loja/descontos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão secundário
                </span>

                <input
                  value={estado.textoBotaoSecundario}
                  onChange={(event) =>
                    onChange({ textoBotaoSecundario: event.target.value })
                  }
                  placeholder="Ex: Ver coleção"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão secundário
                </span>

                <input
                  value={estado.linkBotaoSecundario}
                  onChange={(event) =>
                    onChange({ linkBotaoSecundario: event.target.value })
                  }
                  placeholder="/loja/colecao"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Alinhamento do conteúdo
                </span>

                <select
                  value={estado.alinhamentoConteudo}
                  onChange={(event) =>
                    onChange({ alinhamentoConteudo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ALINHAMENTO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Altura
                </span>

                <select
                  value={estado.alturaBanner}
                  onChange={(event) =>
                    onChange({ alturaBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ALTURA_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Overlay
                </span>

                <select
                  value={estado.overlayBanner}
                  onChange={(event) =>
                    onChange({ overlayBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {OVERLAY_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor do texto
                </span>

                <select
                  value={estado.corTextoBanner}
                  onChange={(event) =>
                    onChange({ corTextoBanner: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_TEXTO_BANNER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Crop ainda não está ativo nesta etapa. Para vídeo, prefira MP4
              com codec H.264 para maior compatibilidade.
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nome interno do bloco
              </span>

              <input
                value={estado.nomeInterno}
                onChange={(event) =>
                  onChange({ nomeInterno: event.target.value })
                }
                placeholder="Ex: Banner principal"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Título
              </span>

              <input
                value={estado.titulo}
                onChange={(event) => onChange({ titulo: event.target.value })}
                placeholder="Título visível"
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Texto
              </span>

              <textarea
                value={estado.texto}
                onChange={(event) => onChange({ texto: event.target.value })}
                rows={5}
                placeholder="Texto do bloco"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Imagem URL
              </span>

              <input
                value={estado.imagemUrl}
                onChange={(event) =>
                  onChange({ imagemUrl: event.target.value })
                }
                placeholder="/uploads/imagem.jpg ou https://..."
                className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Texto do botão
                </span>

                <input
                  value={estado.textoBotao}
                  onChange={(event) =>
                    onChange({ textoBotao: event.target.value })
                  }
                  placeholder="Ex: Comprar agora"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Link do botão
                </span>

                <input
                  value={estado.linkBotao}
                  onChange={(event) =>
                    onChange({ linkBotao: event.target.value })
                  }
                  placeholder="/loja/descontos"
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Cor de fundo
                </span>

                <select
                  value={estado.corFundo}
                  onChange={(event) =>
                    onChange({ corFundo: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {COR_FUNDO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Espaçamento
                </span>

                <select
                  value={estado.espacamento}
                  onChange={(event) =>
                    onChange({ espacamento: event.target.value })
                  }
                  className="h-11 w-full rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-500"
                >
                  {ESPACAMENTO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Esta é a primeira camada de edição visual. Nas próximas etapas,
              vamos adicionar imagem desktop/mobile, crop e editor rico de
              texto.
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar conteúdo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdicionarBlocoModal({
  aberto,
  onClose,
  onSelect,
  salvando,
}: {
  aberto: boolean;
  onClose: () => void;
  onSelect: (tipo: TipoBlocoAdicionar) => void;
  salvando: boolean;
}) {
  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Editor visual
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Adicionar bloco
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Escolha um tipo de bloco para inserir na página.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar seleção de bloco"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {TIPOS_BLOCO_ADICIONAR.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.tipo}
                type="button"
                onClick={() => onSelect(item.tipo)}
                disabled={salvando}
                className="flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>

                <span>
                  <span className="block text-sm font-semibold text-slate-950">
                    {item.nome}
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {item.descricao}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EditorVisualPaginaClient({
  pagina,
  blocos,
  categoriasDisponiveis,
}: EditorVisualPaginaClientProps) {
  const [isPending] = useTransition();
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ordemSalvando, setOrdemSalvando] = useState(false);
  const [editando, setEditando] = useState<BlocoEditandoState>(null);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);

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
  ): Promise<boolean> {
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
        return false;
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
      return true;
    } catch {
      atualizarBlocoLocal(bloco.id, blocoAnterior);
      setErro("Erro ao atualizar bloco.");
      return false;
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

  async function criarBloco(tipo: TipoBlocoAdicionar) {
    const tipoSelecionado = TIPOS_BLOCO_ADICIONAR.find(
      (item) => item.tipo === tipo
    );

    if (!tipoSelecionado) return;

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
            tipo: tipoSelecionado.tipo,
            titulo: tipoSelecionado.tituloInicial,
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
        setModalAdicionarAberto(false);
        setSucesso("Bloco criado.");
      }
    } catch {
      setErro("Erro ao criar bloco.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicaoBloco(bloco: EditorVisualBloco) {
    const config = getConfigObject(bloco.configJson);

    setEditando({
      bloco,
      nomeInterno: bloco.titulo || "",
      titulo: getStringConfig(config, "titulo") || bloco.titulo || "",
      texto:
        getStringConfig(config, "texto") ||
        getStringConfig(config, "descricao") ||
        getStringConfig(config, "conteudo"),
      imagemUrl:
        getStringConfig(config, "imagemUrl") ||
        getStringConfig(config, "imagem") ||
        getStringConfig(config, "backgroundImageUrl"),
      imagemDesktopUrl:
        getStringConfig(config, "imagemDesktopUrl") ||
        getStringConfig(config, "imagemDesktop") ||
        getStringConfig(config, "imagemUrl") ||
        getStringConfig(config, "imagem") ||
        getStringConfig(config, "backgroundImageUrl"),
      imagemMobileUrl:
        getStringConfig(config, "imagemMobileUrl") ||
        getStringConfig(config, "imagemMobile"),
      videoDesktopUrl: getStringConfig(config, "videoDesktopUrl"),
      videoMobileUrl: getStringConfig(config, "videoMobileUrl"),
      videoPosterUrl: getStringConfig(config, "videoPosterUrl"),
      videoLoop: getBooleanConfig(config, "videoLoop", true),
      videoSom: getStringConfig(config, "videoSom") || "MUDO",
      textoBotao:
        getStringConfig(config, "textoBotao") ||
        getStringConfig(config, "botaoTexto"),
      textoBotaoSecundario:
        getStringConfig(config, "textoBotaoSecundario") ||
        getStringConfig(config, "botaoSecundarioTexto"),
      linkBotao:
        getStringConfig(config, "linkBotao") ||
        getStringConfig(config, "botaoLink") ||
        getStringConfig(config, "linkUrl"),
      linkBotaoSecundario:
        getStringConfig(config, "linkBotaoSecundario") ||
        getStringConfig(config, "botaoSecundarioLink"),
      corFundo: getStringConfig(config, "corFundo") || "BRANCO",
      espacamento: getStringConfig(config, "espacamento") || "PADRAO",
      alinhamentoConteudo:
        getStringConfig(config, "alinhamentoConteudo") || "ESQUERDA",
      alturaBanner: getStringConfig(config, "alturaBanner") || "PADRAO",
      overlayBanner: getStringConfig(config, "overlayBanner") || "LEVE",
      corTextoBanner: getStringConfig(config, "corTextoBanner") || "CLARO",
      tipoMidia: getStringConfig(config, "tipoMidia") || "IMAGEM",
      exibirTexto: getBooleanConfig(config, "exibirTexto", true),
      exibirSubtitulo: getBooleanConfig(config, "exibirSubtitulo", true),
      exibirBotaoPrimario: getBooleanConfig(
        config,
        "exibirBotaoPrimario",
        true
      ),
      exibirBotaoSecundario: getBooleanConfig(
        config,
        "exibirBotaoSecundario",
        false
      ),
    });
  }

  function atualizarEdicao(data: Partial<NonNullable<BlocoEditandoState>>) {
    setEditando((current) =>
      current
        ? {
            ...current,
            ...data,
          }
        : current
    );
  }

  async function salvarEdicaoBloco() {
    if (!editando) return;

    setErro("");
    setSucesso("");
    setSalvando(true);

    const configAtual = getConfigObject(editando.bloco.configJson);

    const isBanner = isBannerTipo(editando.bloco.tipo);

    const novoConfig = {
      ...configAtual,
      titulo: editando.titulo,
      texto: editando.texto,
      descricao: editando.texto,
      conteudo: editando.texto,
      textoBotao: editando.textoBotao,
      botaoTexto: editando.textoBotao,
      linkBotao: editando.linkBotao,
      botaoLink: editando.linkBotao,
      linkUrl: editando.linkBotao,
      ...(isBanner
        ? {
            tipoMidia: editando.tipoMidia,
            exibirTexto: editando.exibirTexto,
            exibirSubtitulo: editando.exibirSubtitulo,
            exibirBotaoPrimario: editando.exibirBotaoPrimario,
            exibirBotaoSecundario: editando.exibirBotaoSecundario,
            imagemDesktopUrl: editando.imagemDesktopUrl,
            imagemDesktop: editando.imagemDesktopUrl,
            imagemMobileUrl: editando.imagemMobileUrl,
            imagemMobile: editando.imagemMobileUrl,
            imagemUrl: editando.imagemDesktopUrl,
            videoDesktopUrl: editando.videoDesktopUrl,
            videoMobileUrl: editando.videoMobileUrl,
            videoPosterUrl: editando.videoPosterUrl,
            videoLoop: editando.videoLoop,
            videoSom: editando.videoSom,
            textoBotaoSecundario: editando.textoBotaoSecundario,
            botaoSecundarioTexto: editando.textoBotaoSecundario,
            linkBotaoSecundario: editando.linkBotaoSecundario,
            botaoSecundarioLink: editando.linkBotaoSecundario,
            alinhamentoConteudo: editando.alinhamentoConteudo,
            alturaBanner: editando.alturaBanner,
            overlayBanner: editando.overlayBanner,
            corTextoBanner: editando.corTextoBanner,
          }
        : {
            imagemUrl: editando.imagemUrl,
            corFundo: editando.corFundo,
            espacamento: editando.espacamento,
          }),
    };

    try {
      const salvo = await atualizarBloco(editando.bloco, {
        titulo: editando.nomeInterno || editando.titulo || editando.bloco.titulo,
        configJson: novoConfig,
      });

      if (salvo) {
        setEditando(null);
        setSucesso("Conteúdo do bloco salvo.");
      }
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
            onClick={() => setModalAdicionarAberto(true)}
            disabled={salvando || isPending}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {salvando ? "Criando..." : "Adicionar bloco"}
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
              <PainelSecao title="Conteúdo">
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

                <button
                  type="button"
                  onClick={() => abrirEdicaoBloco(blocoSelecionado)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Type className="h-4 w-4" />
                  Editar conteúdo básico
                </button>
              </PainelSecao>

              <PainelSecao title="Aparência">
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Cor de fundo e espaçamento ficam no modal de conteúdo nesta
                  etapa. Eles são salvos junto com as configurações existentes do
                  bloco.
                </p>
              </PainelSecao>

              <PainelSecao title="Dispositivo atual">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  {device === "DESKTOP" && <Monitor className="h-4 w-4" />}
                  {device === "TABLET" && <Tablet className="h-4 w-4" />}
                  {device === "MOBILE" && <Smartphone className="h-4 w-4" />}
                  {getFrameLabel(device)}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {getDeviceDescription(device)}
                </p>
              </PainelSecao>

              <PainelSecao title="Ações do bloco">
                <div className="grid gap-2">
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
              </PainelSecao>

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

      <EditorConteudoBlocoModal
        estado={editando}
        onChange={atualizarEdicao}
        onClose={() => setEditando(null)}
        onSave={() => void salvarEdicaoBloco()}
        salvando={salvando}
      />

      <AdicionarBlocoModal
        aberto={modalAdicionarAberto}
        onClose={() => setModalAdicionarAberto(false)}
        onSelect={(tipo) => void criarBloco(tipo)}
        salvando={salvando}
      />
    </div>
  );
}
