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
      element.style.outline =
        bloco.id === selectedBlockId ? "1px solid rgb(99 102 241)" : "";
      element.style.outlineOffset = "-1px";

      const handleClick = (event: MouseEvent) => {
        const context = getSelectionContext(event.target);

        event.preventDefault();
        event.stopPropagation();

        window.parent.postMessage(
          {
            type: "STELLA_BUILDER_STUDIO_SELECT",
            pageId,
            blockId: bloco.id,
            context,
          },
          window.location.origin
        );
      };

      element.addEventListener("click", handleClick, true);
      cleanups.push(() => {
        element.removeEventListener("click", handleClick, true);
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
