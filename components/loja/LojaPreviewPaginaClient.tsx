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

        const handleInlineInput = () => {
          const field = inlineElement.dataset.stellaInlineField || "";

          if (!field) return;

          window.parent.postMessage(
            {
              type: "STELLA_BUILDER_STUDIO_INLINE_UPDATE",
              pageId,
              blockId: bloco.id,
              field,
              value: inlineElement.innerText.trim(),
            },
            window.location.origin
          );
        };

        const handleInlineClick = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();

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

        inlineElement.addEventListener("input", handleInlineInput);
        inlineElement.addEventListener("click", handleInlineClick, true);
        inlineCleanups.push(() => {
          inlineElement.removeEventListener("input", handleInlineInput);
          inlineElement.removeEventListener("click", handleInlineClick, true);
          inlineElement.contentEditable = "false";
          inlineElement.style.outline = "";
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

    return () => cleanups.forEach((cleanup) => cleanup());
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
