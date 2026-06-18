"use client";

import { useEffect, useMemo, useState } from "react";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderCategoriaAtual,
  type LojaBuilderMenu,
  type LojaBuilderPagina,
  type LojaBuilderProduto,
} from "@/components/loja/LojaPaginaBuilderClient";
import type { CategoriaMenuPublicoItem } from "@/components/loja/MenuPublicoLoja";
import type { LojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";

type StudioSelectionContext =
  | "BLOCO"
  | "TEXTO"
  | "IMAGEM"
  | "BOTAO"
  | "PRODUTOS"
  | "DESIGN";

type StudioDraftMessage = {
  type: "STELLA_BUILDER_STUDIO_DRAFT";
  pageId: string;
  blocos?: LojaBuilderBloco[];
  selectedBlockId?: string;
};

type InlineRichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: InlineRichTextNode[];
  content?: InlineRichTextNode[];
};

const INLINE_FONT_SIZES: Record<string, string> = {
  "1": "0.75rem",
  "2": "0.875rem",
  "3": "1rem",
  "4": "1.5rem",
  "5": "2.25rem",
  "6": "3rem",
};

function sanitizeInlineUrl(value: string) {
  const url = value.trim();

  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("#")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function normalizeInlineText(value: string) {
  return value.replace(/\u00a0/g, " ");
}

function getStyleMarkFromElement(element: HTMLElement) {
  const style = element.style;
  const attrs: Record<string, unknown> = {};

  if (style.color) attrs.color = style.color;
  if (style.fontFamily) attrs.fontFamily = style.fontFamily;
  if (style.fontSize) attrs.fontSize = style.fontSize;
  if (style.fontWeight) attrs.fontWeight = style.fontWeight;
  if (style.letterSpacing) attrs.letterSpacing = style.letterSpacing;
  if (style.lineHeight) attrs.lineHeight = style.lineHeight;

  if (element.tagName === "FONT") {
    const color = element.getAttribute("color");
    const face = element.getAttribute("face");
    const size = element.getAttribute("size");

    if (color) attrs.color = color;
    if (face) attrs.fontFamily = face;
    if (size && INLINE_FONT_SIZES[size]) attrs.fontSize = INLINE_FONT_SIZES[size];
  }

  return Object.keys(attrs).length > 0
    ? {
        type: "textStyle",
        attrs,
      }
    : null;
}

function getMarksForNode(node: Node) {
  const marks: InlineRichTextNode[] = [];
  let current = node.parentElement;

  while (current && !current.dataset.stellaInlineField) {
    const tag = current.tagName;

    if (tag === "STRONG" || tag === "B") marks.push({ type: "bold" });
    if (tag === "EM" || tag === "I") marks.push({ type: "italic" });
    if (tag === "U") marks.push({ type: "underline" });
    if (tag === "A") {
      const href = sanitizeInlineUrl(current.getAttribute("href") || "");

      if (href) marks.push({ type: "link", attrs: { href } });
    }

    const styleMark = getStyleMarkFromElement(current);
    if (styleMark) marks.push(styleMark);

    current = current.parentElement;
  }

  return marks;
}

function serializeInlineRichText(element: HTMLElement) {
  const content: InlineRichTextNode[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    const text = normalizeInlineText(textNode.textContent || "");

    if (text.length > 0) {
      const marks = getMarksForNode(textNode);
      content.push({
        type: "text",
        text,
        ...(marks.length > 0 ? { marks } : {}),
      });
    }

    textNode = walker.nextNode();
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content,
      },
    ],
  };
}

function applyInlineStyleToSelection(patch: Partial<CSSStyleDeclaration>) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  Object.assign(span.style, patch);
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.addRange(nextRange);
}

function getGalleryItemId(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return "";
  }

  const item = target.closest("[data-stella-editorial-gallery-item-id]");

  if (!(item instanceof HTMLElement)) {
    return "";
  }

  return item.dataset.stellaEditorialGalleryItemId || "";
}

function getSelectionContext(target: EventTarget | null): StudioSelectionContext {
  if (!(target instanceof HTMLElement)) {
    return "BLOCO";
  }

  if (target.closest("a,button,[role='button']")) {
    return "BOTAO";
  }

  if (target.closest("img,picture,video")) {
    return "IMAGEM";
  }

  if (
    target.closest(
      "h1,h2,h3,h4,h5,h6,p,span,strong,em,b,i,small,figcaption"
    )
  ) {
    return "TEXTO";
  }

  if (target.closest("[data-produto-id],[data-carousel],[data-product-card]")) {
    return "PRODUTOS";
  }

  return "BLOCO";
}

export default function LojaPreviewPaginaClient({
  pagina,
  blocos,
  produtos,
  menus,
  categoriasMenu = [],
  categoriaAtual = null,
  configuracaoMenuRodape,
  studioMode = false,
}: {
  pagina: LojaBuilderPagina;
  blocos: LojaBuilderBloco[];
  produtos: LojaBuilderProduto[];
  menus: LojaBuilderMenu[];
  categoriasMenu?: CategoriaMenuPublicoItem[];
  categoriaAtual?: LojaBuilderCategoriaAtual | null;
  configuracaoMenuRodape?: LojaMenuRodapeConfig;
  studioMode?: boolean;
}) {
  const [blocosPreview, setBlocosPreview] = useState(blocos);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const pageId = pagina.id;

  const blocosAtivos = useMemo(() => {
    return blocosPreview.filter((bloco) => bloco);
  }, [blocosPreview]);

  useEffect(() => {
    if (!studioMode) return;

    function handleMessage(event: MessageEvent<StudioDraftMessage>) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;

      if (
        !data ||
        data.type !== "STELLA_BUILDER_STUDIO_DRAFT" ||
        data.pageId !== pageId
      ) {
        return;
      }

      if (Array.isArray(data.blocos)) {
        setBlocosPreview(data.blocos);
      }

      setSelectedBlockId(data.selectedBlockId || "");
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(
      {
        type: "STELLA_BUILDER_STUDIO_READY",
        pageId,
      },
      window.location.origin
    );

    return () => window.removeEventListener("message", handleMessage);
  }, [pageId, studioMode]);

  useEffect(() => {
    if (!studioMode) return;

    const main = document.querySelector("main");
    const blockElements = Array.from(main?.children || []) as HTMLElement[];
    const cleanups: (() => void)[] = [];
    const toolbar = document.createElement("div");
    const linkPopover = document.createElement("div");
    const linkInput = document.createElement("input");
    const linkApply = document.createElement("button");
    const linkRemove = document.createElement("button");
    let activeInlineElement: HTMLElement | null = null;
    let savedRange: Range | null = null;

    toolbar.style.position = "fixed";
    toolbar.style.zIndex = "99999";
    toolbar.style.display = "none";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "4px";
    toolbar.style.flexWrap = "wrap";
    toolbar.style.maxWidth = "min(92vw, 720px)";
    toolbar.style.padding = "7px";
    toolbar.style.border = "1px solid rgba(148,163,184,0.35)";
    toolbar.style.borderRadius = "12px";
    toolbar.style.background = "rgba(255,255,255,0.98)";
    toolbar.style.boxShadow = "0 18px 45px rgba(15,23,42,0.18)";
    toolbar.style.fontFamily = "var(--font-primary, system-ui, sans-serif)";
    toolbar.style.fontSize = "12px";
    toolbar.style.color = "#0f172a";

    function createToolbarButton(label: string, title: string, action: () => void) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.title = title;
      button.style.height = "28px";
      button.style.minWidth = "28px";
      button.style.border = "1px solid rgba(203,213,225,0.85)";
      button.style.borderRadius = "8px";
      button.style.background = "#f8fafc";
      button.style.padding = "0 8px";
      button.style.fontWeight = "700";
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
        notifyInlineUpdate();
        positionToolbar();
      });
      toolbar.appendChild(button);
      return button;
    }

    function createToolbarSelect(
      label: string,
      options: { value: string; label: string }[],
      action: (value: string) => void
    ) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", label);
      select.title = label;
      select.style.height = "28px";
      select.style.border = "1px solid rgba(203,213,225,0.85)";
      select.style.borderRadius = "8px";
      select.style.background = "#fff";
      select.style.padding = "0 7px";
      options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        select.appendChild(item);
      });
      select.addEventListener("mousedown", () => rememberSelection());
      select.addEventListener("change", (event) => {
        event.preventDefault();
        event.stopPropagation();
        restoreSelection();
        action(select.value);
        notifyInlineUpdate();
        positionToolbar();
      });
      toolbar.appendChild(select);
      return select;
    }

    function rememberSelection() {
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    }

    function restoreSelection() {
      if (!savedRange) return;

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    }

    function notifyInlineUpdate() {
      if (!activeInlineElement) return;

      const field = activeInlineElement.dataset.stellaInlineField || "";
      const blockElement = activeInlineElement.closest("[data-studio-bloco-id]") as
        | HTMLElement
        | null;
      const blockId = blockElement?.dataset.studioBlocoId || "";

      if (!field || !blockId) return;

      window.parent.postMessage(
        {
          type: "STELLA_BUILDER_STUDIO_INLINE_UPDATE",
          pageId,
          blockId,
          field,
          value: activeInlineElement.innerText.trim(),
          itemId: getGalleryItemId(activeInlineElement),
          richText: serializeInlineRichText(activeInlineElement),
        },
        window.location.origin
      );
    }

    function positionToolbar() {
      if (!activeInlineElement) return;

      const rect = activeInlineElement.getBoundingClientRect();
      toolbar.style.display = "flex";
      const toolbarRect = toolbar.getBoundingClientRect();
      const left = Math.min(
        window.innerWidth - toolbarRect.width - 8,
        Math.max(8, rect.left + rect.width / 2 - toolbarRect.width / 2)
      );
      const top = rect.top - toolbarRect.height - 10 > 8
        ? rect.top - toolbarRect.height - 10
        : rect.bottom + 10;

      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${Math.min(window.innerHeight - toolbarRect.height - 8, top)}px`;
    }

    function showToolbar(element: HTMLElement) {
      activeInlineElement = element;
      rememberSelection();
      positionToolbar();
    }

    function hideToolbar() {
      activeInlineElement = null;
      savedRange = null;
      toolbar.style.display = "none";
      linkPopover.style.display = "none";
    }

    document.execCommand("styleWithCSS", false, "true");
    createToolbarSelect(
      "Fonte",
      [
        { value: "", label: "Fonte" },
        { value: "var(--font-primary)", label: "Tema" },
        { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
        { value: "Arial, sans-serif", label: "Sans" },
      ],
      (value) => value && document.execCommand("fontName", false, value)
    );
    createToolbarSelect(
      "Tamanho",
      [
        { value: "3", label: "Medio" },
        { value: "2", label: "Pequeno" },
        { value: "4", label: "Grande" },
        { value: "5", label: "Editorial" },
      ],
      (value) => document.execCommand("fontSize", false, value)
    );
    createToolbarButton("B", "Negrito", () => document.execCommand("bold"));
    createToolbarButton("I", "Italico", () => document.execCommand("italic"));
    createToolbarButton("U", "Sublinhado", () => document.execCommand("underline"));
    createToolbarSelect(
      "Alinhamento",
      [
        { value: "justifyLeft", label: "Esquerda" },
        { value: "justifyCenter", label: "Centro" },
        { value: "justifyRight", label: "Direita" },
      ],
      (value) => document.execCommand(value)
    );
    createToolbarSelect(
      "Espacamento",
      [
        { value: "0", label: "Normal" },
        { value: "0.02em", label: "Leve" },
        { value: "0.08em", label: "Aberta" },
      ],
      (value) => applyInlineStyleToSelection({ letterSpacing: value })
    );
    createToolbarSelect(
      "Altura de linha",
      [
        { value: "1", label: "Compacta" },
        { value: "1.15", label: "Normal" },
        { value: "1.35", label: "Aberta" },
      ],
      (value) => applyInlineStyleToSelection({ lineHeight: value })
    );
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.title = "Cor";
    colorInput.style.height = "28px";
    colorInput.style.width = "34px";
    colorInput.style.border = "1px solid rgba(203,213,225,0.85)";
    colorInput.style.borderRadius = "8px";
    colorInput.style.background = "#fff";
    colorInput.addEventListener("mousedown", () => rememberSelection());
    colorInput.addEventListener("input", () => {
      restoreSelection();
      document.execCommand("foreColor", false, colorInput.value);
      notifyInlineUpdate();
    });
    toolbar.appendChild(colorInput);
    createToolbarButton("Link", "Adicionar ou editar link", () => {
      rememberSelection();
      linkPopover.style.display =
        linkPopover.style.display === "flex" ? "none" : "flex";
      linkInput.focus();
    });
    createToolbarButton("Limpar", "Limpar estilo", () => document.execCommand("removeFormat"));

    linkPopover.style.display = "none";
    linkPopover.style.alignItems = "center";
    linkPopover.style.gap = "4px";
    linkPopover.style.width = "100%";
    linkPopover.style.paddingTop = "4px";
    linkInput.type = "url";
    linkInput.placeholder = "https://... ou /loja/...";
    linkInput.style.minWidth = "180px";
    linkInput.style.flex = "1";
    linkInput.style.height = "30px";
    linkInput.style.border = "1px solid rgba(203,213,225,0.85)";
    linkInput.style.borderRadius = "8px";
    linkInput.style.padding = "0 8px";
    linkApply.type = "button";
    linkApply.textContent = "Aplicar";
    linkRemove.type = "button";
    linkRemove.textContent = "Remover";
    [linkApply, linkRemove].forEach((button) => {
      button.style.height = "30px";
      button.style.border = "1px solid rgba(203,213,225,0.85)";
      button.style.borderRadius = "8px";
      button.style.background = "#f8fafc";
      button.style.padding = "0 8px";
      button.style.fontWeight = "700";
      button.addEventListener("mousedown", (event) => event.preventDefault());
    });
    linkApply.addEventListener("click", () => {
      const href = sanitizeInlineUrl(linkInput.value);
      restoreSelection();
      if (href) document.execCommand("createLink", false, href);
      linkPopover.style.display = "none";
      linkInput.value = "";
      notifyInlineUpdate();
    });
    linkRemove.addEventListener("click", () => {
      restoreSelection();
      document.execCommand("unlink");
      linkPopover.style.display = "none";
      linkInput.value = "";
      notifyInlineUpdate();
    });
    linkPopover.append(linkInput, linkApply, linkRemove);
    toolbar.appendChild(linkPopover);
    document.body.appendChild(toolbar);

    const handleDocumentSelection = () => {
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const element =
        node instanceof HTMLElement ? node : node?.parentElement || null;
      const inlineElement = element?.closest("[data-stella-inline-field]");

      if (inlineElement instanceof HTMLElement) {
        showToolbar(inlineElement);
      }
    };

    const handleDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;
      if (toolbar.contains(target)) return;
      if (target.closest("[data-stella-inline-field]")) return;

      hideToolbar();
    };

    document.addEventListener("selectionchange", handleDocumentSelection);
    document.addEventListener("pointerdown", handleDocumentPointerDown);

    blockElements.forEach((element, index) => {
      const bloco = blocosAtivos[index];

      if (!bloco) return;

      element.dataset.studioBlocoId = bloco.id;
      element.style.cursor = "pointer";
      element.style.position =
        getComputedStyle(element).position === "static"
          ? "relative"
          : element.style.position;
      element.style.outline =
        bloco.id === selectedBlockId ? "1px solid rgb(99 102 241)" : "";
      element.style.outlineOffset = "-1px";
      const label = document.createElement("span");
      label.textContent =
        bloco.tipo === "TEXTO_IMAGEM" || bloco.tipo === "IMAGEM_TEXTO"
          ? "Texto + Imagem"
          : bloco.titulo || bloco.tipo.replaceAll("_", " ");
      label.style.position = "absolute";
      label.style.left = "10px";
      label.style.top = "10px";
      label.style.zIndex = "60";
      label.style.pointerEvents = "none";
      label.style.borderRadius = "999px";
      label.style.background = "rgba(255,255,255,0.94)";
      label.style.border = "1px solid rgba(148,163,184,0.35)";
      label.style.boxShadow = "0 8px 20px rgba(15,23,42,0.08)";
      label.style.color = "#334155";
      label.style.fontSize = "11px";
      label.style.fontWeight = "700";
      label.style.letterSpacing = "0.02em";
      label.style.padding = "5px 9px";
      label.style.opacity = bloco.id === selectedBlockId ? "1" : "0";
      label.style.transition = "opacity 160ms ease";
      element.appendChild(label);

      const handleMouseEnter = () => {
        if (bloco.id !== selectedBlockId) {
          element.style.outline = "1px solid rgba(99,102,241,0.45)";
        }
        label.style.opacity = "1";
      };

      const handleMouseLeave = () => {
        element.style.outline =
          bloco.id === selectedBlockId ? "1px solid rgb(99 102 241)" : "";
        label.style.opacity = bloco.id === selectedBlockId ? "1" : "0";
      };

      const handleClick = (event: MouseEvent) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest("[data-stella-inline-field]")
        ) {
          return;
        }

        const context = getSelectionContext(event.target);
        const itemId = getGalleryItemId(event.target);

        event.preventDefault();
        event.stopPropagation();

        window.parent.postMessage(
          {
            type: "STELLA_BUILDER_STUDIO_SELECT",
            pageId,
            blockId: bloco.id,
            context,
            itemId,
          },
          window.location.origin
        );
      };

      element.addEventListener("click", handleClick, true);
      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);

      const inlineElements = Array.from(
        element.querySelectorAll("[data-stella-inline-field]")
      ) as HTMLElement[];
      const inlineCleanups: (() => void)[] = [];

      inlineElements.forEach((inlineElement) => {
        inlineElement.contentEditable = "true";
        inlineElement.spellcheck = false;
        inlineElement.style.outline = "none";
        inlineElement.style.cursor = "text";

        const handleInlineInput = () => {
          const field = inlineElement.dataset.stellaInlineField || "";

          if (!field) return;
          activeInlineElement = inlineElement;

          window.parent.postMessage(
            {
              type: "STELLA_BUILDER_STUDIO_INLINE_UPDATE",
              pageId,
              blockId: bloco.id,
              field,
              value: inlineElement.innerText.trim(),
              itemId: getGalleryItemId(inlineElement),
              richText: serializeInlineRichText(inlineElement),
            },
            window.location.origin
          );
        };

        const handleInlineClick = (event: MouseEvent) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("a")
          ) {
            event.preventDefault();
          }

          event.stopPropagation();
          showToolbar(inlineElement);

          window.parent.postMessage(
            {
              type: "STELLA_BUILDER_STUDIO_SELECT",
              pageId,
              blockId: bloco.id,
              context: getSelectionContext(inlineElement),
              itemId: getGalleryItemId(inlineElement),
            },
            window.location.origin
          );
        };

        const handleInlinePaste = (event: ClipboardEvent) => {
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") || "";
          document.execCommand("insertText", false, text);
          handleInlineInput();
        };
        const handleInlineFocus = () => showToolbar(inlineElement);
        const handleInlineKeyup = () => {
          activeInlineElement = inlineElement;
          rememberSelection();
          positionToolbar();
        };
        const handleInlineMouseup = () => {
          activeInlineElement = inlineElement;
          rememberSelection();
          positionToolbar();
        };

        inlineElement.addEventListener("input", handleInlineInput);
        inlineElement.addEventListener("click", handleInlineClick, true);
        inlineElement.addEventListener("focus", handleInlineFocus);
        inlineElement.addEventListener("keyup", handleInlineKeyup);
        inlineElement.addEventListener("mouseup", handleInlineMouseup);
        inlineElement.addEventListener("paste", handleInlinePaste);
        inlineCleanups.push(() => {
          inlineElement.removeEventListener("input", handleInlineInput);
          inlineElement.removeEventListener("click", handleInlineClick, true);
          inlineElement.removeEventListener("focus", handleInlineFocus);
          inlineElement.removeEventListener("keyup", handleInlineKeyup);
          inlineElement.removeEventListener("mouseup", handleInlineMouseup);
          inlineElement.removeEventListener("paste", handleInlinePaste);
          inlineElement.contentEditable = "false";
          inlineElement.style.outline = "";
          inlineElement.style.cursor = "";
        });
      });

      cleanups.push(() => {
        element.removeEventListener("click", handleClick, true);
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        inlineCleanups.forEach((cleanup) => cleanup());
        label.remove();
        element.style.cursor = "";
        element.style.outline = "";
        element.style.outlineOffset = "";
        delete element.dataset.studioBlocoId;
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener("selectionchange", handleDocumentSelection);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      toolbar.remove();
    };
  }, [blocosAtivos, pageId, selectedBlockId, studioMode]);

  return (
    <LojaPaginaBuilderClient
      pagina={pagina}
      blocos={blocosAtivos}
      produtos={produtos}
      menus={menus}
      categoriasMenu={categoriasMenu}
      categoriaAtual={categoriaAtual}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}
