import "server-only";

export {
  montarDiagnosticoFinanceiro,
  montarDiagnosticoFinanceiro as montarInteligenciaGerencial,
} from "@/lib/financeiro/diagnostico";

export type {
  DiagnosticoAlerta,
  DiagnosticoEstoque,
  DiagnosticoFinanceiro,
  DiagnosticoIndicadores,
  DiagnosticoPrevisao,
  DiagnosticoPrevisaoCenario,
  DiagnosticoProdutoGiro,
  HistoricoDiagnosticoItem,
  MontarDiagnosticoFinanceiroParams,
  SeveridadeDiagnostico,
  StatusSaudeFinanceira,
} from "@/lib/financeiro/diagnostico";
