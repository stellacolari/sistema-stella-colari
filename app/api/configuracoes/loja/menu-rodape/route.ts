import { NextResponse } from "next/server";
import {
  buscarConfiguracaoMenuRodape,
  salvarConfiguracaoMenuRodape,
} from "@/lib/loja/menu-rodape-config";
import {
  exigirAcessoConteudo,
  payloadDentroDoLimite,
  payloadJsonDentroDoLimite,
  validarOrigemMutacao,
} from "@/lib/loja/conteudo/api-auth.server";
import { urlConteudoPermitida } from "@/lib/loja/conteudo/contracts";
import { normalizarLojaMenuRodapeConfig } from "@/lib/loja/menu-rodape-config-types";

export async function GET() {
  const usuario = await exigirAcessoConteudo("ver");
  if (!usuario) return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });

  try {
    const configuracao = await buscarConfiguracaoMenuRodape();

    return NextResponse.json(
      { configuracao },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Erro ao carregar menu e rodapé:", error);

    return NextResponse.json(
      { error: "Erro ao carregar menu e rodapé." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const usuario = await exigirAcessoConteudo("editar");
  if (!usuario) return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
  if (!validarOrigemMutacao(req)) {
    return NextResponse.json({ error: "Origem da requisição inválida." }, { status: 403 });
  }
  if (!payloadDentroDoLimite(req)) {
    return NextResponse.json({ error: "Conteúdo excede o limite permitido." }, { status: 413 });
  }

  try {
    const body = await req.json();
    if (!payloadJsonDentroDoLimite(body)) {
      return NextResponse.json({ error: "Conteúdo excede o limite permitido." }, { status: 413 });
    }
    const entrada = normalizarLojaMenuRodapeConfig(body.configuracao);
    const destinos = [
      ...entrada.rodape.colunas.flatMap((coluna) => coluna.links.map((link) => link.href)),
      ...entrada.redesSociais.map((rede) => rede.url),
      ...entrada.selos.map((selo) => selo.linkUrl || ""),
    ].filter(Boolean);
    if (destinos.some((destino) => !urlConteudoPermitida(destino))) {
      return NextResponse.json(
        { error: "Menu ou rodapé contém um destino inválido." },
        { status: 400 },
      );
    }
    const configuracao = await salvarConfiguracaoMenuRodape(entrada);

    return NextResponse.json({ ok: true, configuracao });
  } catch (error) {
    console.error("Erro ao salvar menu e rodapé:", error);

    return NextResponse.json(
      { error: "Erro ao salvar menu e rodapé." },
      { status: 500 }
    );
  }
}
