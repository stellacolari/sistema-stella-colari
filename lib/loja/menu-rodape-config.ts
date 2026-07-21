import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LOJA_MENU_RODAPE_CHAVE,
  type LojaMenuRodapeConfig,
  lojaMenuRodapeConfigPadrao,
  normalizarLojaMenuRodapeConfig,
} from "@/lib/loja/menu-rodape-config-types";

export async function buscarConfiguracaoMenuRodape(): Promise<LojaMenuRodapeConfig> {
  const registro = await prisma.lojaMenuRodapeConfiguracao.findUnique({
    where: {
      chave: LOJA_MENU_RODAPE_CHAVE,
    },
  });

  if (!registro) {
    return lojaMenuRodapeConfigPadrao;
  }

  return normalizarLojaMenuRodapeConfig(registro.configJson);
}

export async function salvarConfiguracaoMenuRodape(
  config: unknown
): Promise<LojaMenuRodapeConfig> {
  const configNormalizada = normalizarLojaMenuRodapeConfig(config);
  const registroAtual = await prisma.lojaMenuRodapeConfiguracao.findUnique({
    where: {
      chave: LOJA_MENU_RODAPE_CHAVE,
    },
    select: {
      configJson: true,
    },
  });
  const configAtual = registroAtual?.configJson;
  const stellaSetup =
    configAtual && typeof configAtual === "object" && !Array.isArray(configAtual)
      ? configAtual._stellaSetup
      : undefined;
  const configPersistida = stellaSetup
    ? { ...configNormalizada, _stellaSetup: stellaSetup }
    : configNormalizada;

  await prisma.lojaMenuRodapeConfiguracao.upsert({
    where: {
      chave: LOJA_MENU_RODAPE_CHAVE,
    },
    create: {
      chave: LOJA_MENU_RODAPE_CHAVE,
      configJson: configPersistida as Prisma.InputJsonValue,
    },
    update: {
      configJson: configPersistida as Prisma.InputJsonValue,
    },
  });

  return configNormalizada;
}
