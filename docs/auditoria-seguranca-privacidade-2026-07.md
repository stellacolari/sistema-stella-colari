# Auditoria técnica de segurança, cookies e proteção de dados

Data técnica: 23/07/2026

Escopo: código e comportamento observável da Plataforma Stella Colari

Limite: este documento não substitui revisão jurídica, contratual, de infraestrutura ou teste de restauração.

## 1. Superfície e matriz de rotas críticas

O inventário estático encontrou 140 arquivos de API e 124 arquivos com métodos mutáveis. A matriz abaixo cobre os fluxos de maior risco; rotas administrativas do mesmo prefixo herdam a autenticação do middleware e, quando sensíveis, devem também usar a permissão granular no handler.

| Rota/fluxo | Autenticação | Autorização | Dados acessados | Cache | Risco após correções | Evidência/teste |
| --- | --- | --- | --- | --- | --- | --- |
| `/login`, `/api/auth/login` | cookie admin assinado após senha válida | perfil legado no middleware; DB nas páginas/helpers | usuário admin, último login | login deve ser `no-store` | médio: sessão não é opaca nem revogável no servidor | typecheck, build, teste de rate limit |
| admin e `/api/{clientes,compras,configuracoes,...}` | cookie admin `HttpOnly` | middleware + helpers granulares existentes | dados operacionais e administrativos | privado | médio: nem todo handler antigo revalida perfil customizado | varredura de handlers |
| Server Actions de clientes/compras/itens/regras | sessão admin | permissão granular dentro da action | PII, compras, produtos, custos/estoque | revalidação Next | baixo | teste estático `test:security` |
| `/loja/entrar`, `/api/loja/auth/entrar` | senha PBKDF2 | cliente ativo | cadastro e saldo do próprio cliente | `no-store` | baixo | sessão opaca + rate limit |
| `/api/loja/auth/cadastrar` | pública | validação server-side | nome, contato, CPF, senha hash | `no-store` | baixo/médio: cadastro ainda depende de prevenção distribuída futura | senha forte + rate limit |
| `/loja/minha-conta` e APIs | cookie opaco, hash no banco | cliente da sessão | cadastro, pedidos, consentimentos | privado/`no-store` | baixo | teste sessão segura A × B |
| `/loja/pedido/[codigo]` | cliente proprietário ou token opaco | comparação segura do hash | DTO sanitizado do pedido | privado, `no-store`, `noindex` | baixo | teste pedido A × B/token inválido |
| `/api/loja/checkout` | pública com vínculo de cliente quando aplicável | dados e preços recalculados no servidor | carrinho, endereço, pedido, estoque | `no-store` | médio: carga distribuída requer limitador externo futuro | build + contrato estático |
| `/api/loja/stripe/criar-checkout` | proprietário ou token do pedido | correlação com pedido | total e identificadores do pedido | privado, `no-store` | baixo | chave de idempotência e teste estático |
| `/api/loja/stripe/webhook` | assinatura Stripe sobre corpo bruto | sessão/pedido/valor/moeda correlacionados | pagamento, pedido, estoque, cashback | dinâmico, sem cache | baixo/médio: fixtures Stripe reais ainda pendentes | assinatura, correlação e idempotência estáticas |
| `/api/loja/frete/cotar` | pública | produtos e configuração recalculados | CEP e itens | dinâmico | médio: limitador local por instância | rate limit + sem emissão de etiqueta |
| `/api/loja/cupons/validar` | pública/cliente opcional | regra e limites no servidor | cupom, subtotal, histórico do cliente | dinâmico | médio: limitador local por instância | rate limit |
| `/api/configuracoes/loja/uploads` | admin no middleware e handler | permissão granular `lojaOnline:criar` | arquivo público no Blob | não aplicável | baixo | MIME real, magic bytes, extensão derivada do MIME, tamanho e pixels |
| `/loja/preview/pagina/*` | sessão admin | acesso de preview | conteúdo não publicado | `no-store`, `noindex` | baixo | middleware |
| `/api/loja/formularios` | pública | aceite de termos + validação | contato e mensagem | dinâmico | médio: consentimento de marketing não tem versão própria no schema | limite de payload + rate limit |

Não foi encontrada recuperação de senha implementada. Logo, não existe endpoint para limitar; criar esse fluxo é trabalho futuro e não deve ser improvisado no lançamento.

## 2. Autenticação, sessão e autorização

### Administrativo

- senha: `scrypt`, salt aleatório e comparação em tempo constante;
- cookie: `stella_admin_session`, próprio, `HttpOnly`, `SameSite=Lax`, `Secure` em produção, caminho `/`;
- duração: 8 horas; opção “manter conectado” por 5 dias;
- cada login gera um identificador aleatório assinado (`jti`), evitando reutilização determinística do token em logins simultâneos;
- retorno após login: somente caminho interno, rejeitando esquemas, `//`, barras invertidas, caracteres de controle, `/api` e retorno ao próprio login;
- enumeração: resposta uniforme para conta inexistente/inativa e senha inválida;
- brute force: limite local de 5 tentativas por combinação IP + e-mail e 30 por IP a cada 15 minutos;
- correção: Server Actions críticas agora revalidam permissão no servidor.

Risco residual: a sessão administrativa é um token assinado e não uma sessão opaca persistida. Logout apaga o cookie, mas não revoga uma cópia roubada até a expiração. O middleware também usa o perfil legado do token; handlers antigos que não chamam um helper granular podem não refletir todas as restrições de um perfil administrativo customizado. Corrigir isso exige desenho de sessão persistida e cobertura sistemática de todos os handlers, não um patch apressado.

### Cliente

- token opaco aleatório de 256 bits;
- apenas SHA-256 do token é persistido em `ClienteSessao`;
- cookie próprio `HttpOnly`, `SameSite=Lax`, `Secure` em produção;
- expiração no banco, rotação no login e revogação no logout;
- status do cliente revalidado;
- user agent é armazenado como hash na sessão;
- login limitado por IP e pela combinação IP + identificador;
- cadastro limitado e novas senhas exigem ao menos 10 caracteres, letras e números;
- cookie legado `stella_cliente_id` é apagado e não autoriza acesso.

Os testes sintéticos cobrem cliente A × B, token inválido, entropia, hash e pedido de outro cliente.

## 3. Pedido, checkout, Stripe e estoque

- o acesso público ao pedido usa token aleatório de 256 bits; apenas o hash é persistido;
- o token pode ser convertido em cookie `HttpOnly`; a URL é limpa;
- respostas inexistentes/não autorizadas são indistinguíveis (`404`);
- o DTO público não inclui custo, margem, documento, telefone, endereço completo, IP, user agent ou observação interna;
- preço, promoção, cupom, cashback, frete e total são recalculados no servidor;
- estoque é revalidado na transação;
- baixas de produto, adicional e embalagem agora usam atualização condicional com saldo `>=` e decremento atômico;
- a efetivação de um pedido pago reivindica o estado `PROCESSANDO_PAGAMENTO`;
- criação do Checkout Session usa chave de idempotência por pedido;
- webhook preserva corpo bruto e rejeita assinatura inválida;
- antes da efetivação, o webhook correlaciona pedido, Checkout Session, referência, moeda e valor;
- cashback usa reivindicação transacional `PENDENTE -> PROCESSANDO -> CREDITADO` no webhook e no painel, evitando crédito duplo;
- logs detalhados de objetos Stripe e payloads foram removidos.
- links configuráveis da home, menus e rodapé passam por lista de protocolos permitidos; `javascript:`, `data:`, URLs de rede (`//`) e caracteres de controle são descartados;

Não houve pagamento, estorno, frete ou etiqueta real durante a auditoria.

## 4. Cookies e armazenamento do navegador

Inventário do código e dos headers observáveis. O skill de Browser proíbe ler diretamente o armazenamento interno do perfil; por isso os atributos são confirmados por código e `Set-Cookie`, e a experiência é validada pela interface.

### Cookies próprios

| Nome | Domínio/caminho | Finalidade/origem | Duração | HttpOnly | Secure | SameSite | Categoria | Criação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stella_admin_session` | host atual, `/` | sessão do painel | 8 h ou 5 dias | sim | produção | Lax | essencial | login admin válido |
| `stella_cliente_session` | host atual, `/` | sessão do cliente | cookie de sessão/DB 12 h, ou 30 dias ao lembrar | sim | produção | Lax | essencial | login/cadastro/checkout com conta |
| `stella_pedido_access` | host atual, `/` | acesso a um pedido específico | 30 dias | sim | produção | Lax | essencial | token de pedido autorizado |
| `stella_cliente_id` | host atual, `/` | legado | expiração imediata | sim | produção | Lax | não aplicável | somente remoção |

Não existe cookie próprio de consentimento: a escolha é guardada no armazenamento local, porque precisa ser acessível à interface antes de qualquer recurso opcional.

Não foi encontrado código que crie cookie de analytics, publicidade, Stripe ou Vercel na aplicação. Cookies que uma página hospedada pelo próprio Stripe possa criar pertencem ao domínio e à política do Stripe, fora da página Stella. Cookies de proteção da plataforma Vercel podem variar por configuração externa e devem ser observados novamente após o domínio definitivo estar correto.

### `localStorage`

| Chave | Finalidade | Categoria | Antes do consentimento | Revogação |
| --- | --- | --- | --- | --- |
| `sistema-stella-carrinho` | manter o carrinho | essencial/funcional necessário | permitido | pelo usuário/navegador |
| `stella_privacidade_consentimento` | versão, data/hora e escolhas | essencial | criado após escolha | redefinível |
| `stella-favoritos-produtos` | favoritos | personalização | bloqueado | removido |
| `stella-buscas-recentes` | buscas recentes | personalização | bloqueado | removido |
| `stella_loja_session_id` | identificador aleatório de analytics | analytics | bloqueado | removido |
| `stella-admin-sidebar` e preferências de colunas/visão | ergonomia do painel autenticado | essencial ao painel | apenas admin | navegador |

### `sessionStorage`

| Chave | Finalidade | Categoria | Antes do consentimento | Revogação |
| --- | --- | --- | --- | --- |
| `stella_loja_eventos_recentes` | deduplicação de eventos | analytics | bloqueado | removido |

Não foi encontrado uso de IndexedDB.

## 5. Consentimento e comunicação comercial

- banner anterior a analytics/personalização;
- botões “Aceitar todos” e “Rejeitar não essenciais” com peso visual equivalente;
- “Configurar” abre escolhas separadas;
- somente Essenciais é pré-marcado e bloqueado;
- Analytics e Personalização começam desligados;
- Marketing aparece indisponível, porque não há tecnologia publicitária ativa;
- versão `2026-07-privacidade-v2`, data/hora e escolha são registradas;
- rejeição e revogação removem identificador de analytics, deduplicação, favoritos e buscas recentes;
- o rodapé permite reabrir preferências;
- WhatsApp é um consentimento separado, opcional e revogável em Minha Conta;
- compra não depende de consentimento de marketing.

Risco residual: respostas de formulário guardam o booleano de marketing e a origem, mas o schema atual não possui versão textual dedicada. Não foi criada migration nesta auditoria.

## 6. Matriz técnica LGPD

“Base legal a confirmar” significa confirmação por assessoria jurídica; este inventário não atribui base legal.

| Dado | Titular/origem | Finalidade técnica comprovada | Rota/tela | Tabela/campo | Destinatário/operador comprovado no código | Localização | Retenção/exclusão atual | Base legal | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nome, e-mail, telefone, CPF | cliente, cadastro/checkout | conta, pedido, contato e identificação | cadastro, checkout, Minha Conta | `Cliente`, `PedidoOnline` | app, Neon; Stripe recebe e-mail no checkout | não confirmada contratualmente | sem prazo aprovado; edição parcial | confirmar | alto jurídico |
| endereço e CEP | cliente, checkout | entrega e cotação | checkout/pedido | `PedidoOnline`, envio | app, Neon, Melhor Envio, ViaCEP | não confirmada | vinculado ao pedido; sem prazo aprovado | confirmar | alto jurídico |
| senha | cliente/admin | autenticação | login/cadastro | hash em `Cliente`/`UsuarioAdmin` | app, Neon | não confirmada | sem senha em claro; política de descarte pendente | confirmar | médio |
| token de sessão | sistema | autenticação e revogação | login/Minha Conta | hash em `ClienteSessao`; admin assinado | app, Neon no cliente | não confirmada | expiração/revogação cliente; admin não persistido | confirmar | médio |
| pedido, itens e valores | cliente/compra | operação comercial | checkout/pedido/admin | `PedidoOnline` e relações | app, Neon, Stripe, Melhor Envio | não confirmada | sem prazo aprovado; exclusão automática proibida | confirmar | alto jurídico |
| pagamento | Stripe/webhook | confirmar pagamento | Stripe/webhook | IDs/status/valor no pedido | Stripe, app, Neon | não confirmada | sem prazo aprovado | confirmar | alto jurídico |
| consentimento WhatsApp | cliente | prova de preferência por finalidade | cadastro/checkout/Minha Conta | `ClienteConsentimento` | app, Neon | não confirmada | histórico e revogação; prazo pendente | confirmar | médio |
| consentimento de cookies | visitante/navegador | respeitar escolhas | banner/rodapé | `localStorage` | navegador do titular | dispositivo | redefinição/revogação local | confirmar | baixo |
| analytics próprio | visitante | métricas de uso/funil | loja pública | evento comercial e identificador aleatório | app, Neon | não confirmada | prazo de banco pendente; local removível | confirmar | médio |
| IP/user agent | infraestrutura/sessão/formulário | segurança e diagnóstico | APIs/sessões | logs de plataforma; hash SHA-256 de UA em sessão e novos formulários | Vercel, app, Neon | não confirmada | prazo pendente; registros legados podem conter UA bruto | confirmar | alto |
| mensagem de atendimento | visitante | responder solicitação | formulários | `LojaFormularioResposta` | app, Neon | não confirmada | sem prazo aprovado | confirmar | alto |
| dados administrativos | colaboradores | acesso e auditoria | painel | `UsuarioAdmin` e registros operacionais | app, Neon, Vercel | não confirmada | prazo pendente | confirmar | médio |

Integrações encontradas: Vercel/Next.js, Vercel Blob, Neon/PostgreSQL via Prisma, Stripe, Melhor Envio, ViaCEP, OpenStreetMap Nominatim e OpenRouteService. HostGator aparece no contexto operacional do domínio, não como fluxo de dados implementado no código. Relações contratuais, suboperadores, países e transferências internacionais não foram confirmados.

## 7. Direitos, retenção e descarte

### Existente

- cliente autenticado pode consultar e corrigir parte do cadastro;
- consentimento de WhatsApp pode ser consultado e revogado;
- preferências do navegador podem ser revistas e revogadas;
- sessões de cliente expiram e podem ser revogadas;
- pedido público exige titularidade ou token.

### Pendente operacional/jurídico

- canal oficial de privacidade e responsável;
- protocolo interno para confirmação de identidade;
- fluxo de acesso/exportação sanitizada;
- status e trilha de solicitações;
- critérios de correção, oposição, portabilidade, anonimização e exclusão;
- prazos de retenção por categoria;
- exceções fiscais, contábeis, antifraude e defesa em processo;
- rotina de sessões expiradas, formulários antigos, eventos e arquivos órfãos;
- contratos e instruções a operadores.

Nenhuma exclusão real foi executada. Uma futura rotina deve iniciar sempre em `dry-run`, produzir apenas contagens por categoria, exigir aprovação e nunca apagar pedidos/pagamentos sem política jurídica aprovada.

Foi incluído o comando `npm run auditar:retencao:dry-run -- --antes-de=AAAA-MM-DD`. Ele exige data de corte explícita, consulta somente contagens agregadas e não contém operações de escrita. A execução contra qualquer ambiente depende de autorização operacional; ela não define prazo de retenção e não foi rodada nesta auditoria.

## 8. Backups e incidentes

O código não comprova política, frequência nem restauração de backup do Neon ou Blob. O estado correto é **não validado** até uma restauração controlada em ambiente isolado.

Procedimento mínimo:

1. registrar horário, sistema, ambiente e responsável, sem copiar segredo para o ticket;
2. conter acesso comprometido e preservar logs/evidências;
3. identificar categorias de dados, titulares, período e operadores afetados;
4. rotacionar credenciais suspeitas por procedimento aprovado, sem derrubar integração crítica sem coordenação;
5. avaliar integridade de pedidos, pagamentos, estoque, sessões e arquivos;
6. acionar jurídico/privacidade para avaliar risco e comunicações aplicáveis;
7. restaurar somente de backup testado, validar consistência e documentar;
8. registrar causa raiz, correção, monitoramento e lições aprendidas.

Responsáveis, contatos, SLA e critérios de comunicação permanecem pendentes de definição organizacional.

## 9. Dependências e segredos

- `npm audit --omit=dev`: zero vulnerabilidades no baseline;
- Next 15.5.21, Prisma 6.19.3, Stripe 22.1.1 e Sharp 0.35.3 estão em versões sem alerta do audit executado;
- existem atualizações, inclusive majors, mas não foram aplicadas sem necessidade comprovada;
- não foram encontrados segredos em arquivos rastreados na varredura por padrões;
- `.env` não foi alterado nem incluído no commit;
- valores de variáveis não são reproduzidos neste relatório.

Variáveis críticas por função: `DATABASE_URL` (banco), `ADMIN_SESSION_SECRET` (sessão admin), `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` (Stripe), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (chave pública), token do Melhor Envio (frete), `NEXT_PUBLIC_SITE_URL` (URLs canônicas). Presença, modo teste/produção e rotação devem ser conferidos no ambiente Vercel sem expor valores.

## 10. Riscos residuais e gate adversarial

| Pergunta | Resposta técnica |
| --- | --- |
| Alguma rota privada acessível sem autorização? | não foi reproduzida; risco médio de granularidade em APIs administrativas antigas permanece |
| Cliente A acessa cliente B? | testes de helpers e rotas críticas indicam não |
| Pedido pode ser enumerado? | código pode ser tentado, mas resposta uniforme não libera DTO sem sessão/token |
| Checkout aceita valor do navegador? | não; valores são recalculados |
| Webhook aceita assinatura inválida/replay? | assinatura inválida é rejeitada; replay é neutralizado por estados/idempotência |
| Há segredo exposto? | nenhum encontrado na árvore rastreada; histórico remoto e plataforma exigem revisão própria |
| Há PII em logs? | logs críticos alterados não registram payload; auditoria completa de observabilidade externa é pendente |
| Não essenciais antes do consentimento? | os recursos próprios mapeados estão bloqueados |
| Rejeição e revogação funcionam? | sim, com limpeza do armazenamento opcional da aplicação |
| Há dark pattern? | não no banner corrigido |
| Políticas refletem o sistema? | refletem o comportamento técnico conhecido e registram pendências |
| Há campo pessoal sem finalidade clara? | novos formulários minimizam user agent por hash; registros legados e alguns campos administrativos exigem decisão de retenção/minimização |
| Há dado sem retenção definida? | sim; é pendência jurídica/operacional alta |
| Existe risco crítico ou alto pendente? | não técnico crítico reproduzido; há pendências altas jurídicas/operacionais e risco técnico médio de sessão/permissões admin |

## 11. Veredito técnico

**GO WITH CAVEATS**

O hardening reduz riscos concretos de autorização direta, brute force, CSRF, XSS em JSON-LD, upload malicioso, sessão Stripe duplicada, correlação de webhook, cashback e concorrência de estoque. O lançamento ainda depende de: domínio definitivo correto, configuração Vercel/Stripe confirmada, revisão jurídica, definição de retenção/direitos, teste de restauração e plano para sessão/permissões administrativas persistentes.
