# Changelog

## 2026-10-27 — Movimentos da confirmação

- Adaptadas as animações do repositório `x5med/obrigado-x5med` (referência `0bc2798`): entrada do ingresso, inclinação com o mouse, faixas contínuas/paralaxe e apresentação dos próximos passos conforme a rolagem.
- Efeitos em camadas independentes, com requestAnimationFrame, listeners passivos e limpeza ao cadastrar outra pessoa. Preferência de movimento reduzido desliga as animações e mantém o conteúdo visível.

## 2026-10-27 — Confirmação em formato de ingresso

- Nova confirmação com fundo azul, ingresso EscalaMED, datas e localização, baseada em `obrigado.x5med.com.br/escalamed`.
- Próximos passos adaptados ao formulário: contato pelo WhatsApp, reserva das datas e chegada a Alphaville, sem afirmar pagamento ou aprovação.
- Mantidos protocolo, aviso de cadastro em conferência e opção de cadastrar outra pessoa; caminho pago e eventos permanecem separados.

## 2026-10-27 — Opção Meta marcada inicialmente

- A opção de compartilhamento com a Meta começa marcada nas novas inscrições e continua opcional, podendo ser desmarcada pelo usuário.

## 2026-10-27 — Opção de contato ativada inicialmente

- O toggle de contato pelo WhatsApp começa ativado nas novas inscrições e pode ser desativado pelo usuário. Rascunhos continuam respeitando a escolha salva.

## 2026-10-26 — Benefício acima dos campos

- Texto de abertura atualizado para “Análise do seu perfil e retorno de um consultor pelo WhatsApp.”

## 2026-10-26 — Ação de inscrição sempre à mão

- Botão de envio com o texto “Quero garantir minha vaga”, tanto com cupom quanto na inscrição paga.
- Área de envio acompanha a parte inferior da tela durante o preenchimento, dentro do formulário, com margem de rolagem nos controles e respeito à área segura do celular.
- Espaçamento final reduzido; orientações de pagamento e gratuidade continuam junto ao botão.

## 2026-10-26 — WhatsApp, atribuição do checkout e eventos Meta

- Prefixo +55 fixo no campo, normalização compartilhada de DDI e DDD, sem cortar silenciosamente números excessivos; telefone E.164 com + no dataLayer.
- Checkout recebe os parâmetros da sessão `x5_click_params`, além da URL atual e fallback legado, com tratamento de codificação.
- Conclusão protegida contra repetição do mesmo envio; `sign_up` exige resposta gratuita e cupom válido, sem disparo no pagamento pendente.
- Fontes dos eventos GTM/Meta e regra de qualificação do Metrics documentadas em `tracking/README.md`, com testes dos dois caminhos.

## 2026-10-26 — Clique na inscrição orienta o preenchimento

- Botão clicável com formulário vazio ou incompleto, exibindo os erros existentes e levando o foco ao primeiro campo pendente com rolagem centralizada.
- A autorização de WhatsApp continua obrigatória na validação e na API; o botão fica desativado somente durante o envio.
- Erros de campo retornados pelo servidor recebem o mesmo direcionamento, respeitando a preferência por movimento reduzido.

## 2026-10-19 — Novo cupom Varanda

- Varanda libera a inscrição gratuita, aceita maiúsculas, minúsculas, acentos e espaços, com identificação do cupom no Metrics.

## 2026-10-16 — Autorização opcional mais discreta

- Texto resumido para a medição de campanhas da Meta, sem caixa colorida ou borda competindo com a autorização de WhatsApp.
- Explicação completa disponível em “Como seus dados são usados”, mantendo a escolha opcional desmarcada e o mesmo escopo de compartilhamento.

## 2026-10-16 — Novo cupom Terapeutica

- Terapeutica libera a inscrição gratuita e aceita variações de maiúsculas, acentos e espaços, com envio do código normalizado ao Metrics.

## 2026-10-16 — Erros de preenchimento por campo

- Tela e API compartilham as mesmas regras de nome, e-mail, telefone brasileiro, usuário do Instagram, cargo, faturamento, cupom e autorização obrigatória de contato. Telefones com DDI e celulares legados usam a normalização do CRM; formatos inválidos e sequências fictícias recebem orientação e exemplo.
- Mensagens aparecem abaixo do campo ao sair dele ou tentar concluir; erros retornados pela API são associados aos campos, com foco no primeiro problema e atributos acessíveis. Dados digitados e rascunho são preservados, sem truncar silenciosamente nome/e-mail inválidos.
- Indisponibilidade do serviço tem aviso separado, sem atribuir a falha ao preenchimento. Compartilhamento Meta continua opcional e desmarcado por padrão; não altera regras de identidade, tombstones, inscrição ou consentimento do CRM.
- Testes Node de validação/API/UI, lint, tipagem, build e conferência visual desktop/celular. Casos inválidos são barrados antes de chamar o CRM, sem inscrições ou mensagens reais durante os testes.

## 2026-10-16 — Novo cupom SAUDE

- SAUDE libera a inscrição gratuita, aceitando variações de maiúsculas, minúsculas, acentos e espaços, e segue identificado no envio ao Metrics.

## 2026-10-15 — Escolha opcional de retorno comercial à Meta

- Aceite opcional, separado do WhatsApp, para identificadores mínimos com hash e etapas comerciais via Metrics. Inicia desmarcado, não é restaurado do rascunho e recusar não bloqueia a inscrição.
- Somente a conclusão transmite uma decisão booleana; a API fixa a versão do aviso no servidor e rejeita valores malformados. Não concede autorização pelo WebMCP, cookies ou opt-in WhatsApp.
- Preservado o ajuste de ocultar a mensagem de confirmação do WhatsApp. Seis testes Node, lint dos arquivos alterados e build de produção aprovados; integração do recibo e envio são validados no Metrics.

## 2026-10-15 — Confirmação visual simplificada

- Ao ativar a autorização de contato, o aviso auxiliar desaparece e permanecem apenas o texto do aceite e o link da Política de Privacidade.

## 2026-10-15 — Contato obrigatório para concluir a inscrição

- A autorização de contato pelo WhatsApp agora é obrigatória para dar continuidade à inscrição, com texto mais claro sobre seu uso operacional no evento.
- O aceite passou a usar um toggle switch e o botão de inscrição permanece bloqueado até sua ativação.
- A API e a ferramenta de envio também exigem a autorização ativa, evitando conclusões sem o contato necessário.

## 2026-10-08 — Novo cupom Bioma100

- O cupom `Bioma100` libera a inscrição gratuita e aceita variações de maiúsculas, minúsculas e espaços.

## 2026-10-07 — Novo cupom CS

- O cupom `CS` libera a inscrição gratuita e aceita variações de maiúsculas, minúsculas e espaços.

## 2026-10-05 — Novo cupom Felipe

- O cupom `Felipe` libera a inscrição gratuita e aceita variações de maiúsculas, minúsculas, acentos e espaços.

## 2026-10-02 — GTM compartilhado nas landing pages

- O gerador do contêiner `GTM-M4GT66JQ` passa a atender as LPs de EscalaMED, Secretária, Precificação, Bioma e Imersão.
- O GA4 usa a propriedade global da X5 Med, enquanto o Pixel da Meta é escolhido por domínio e página de obrigado.
- A conversão do Google Ads continua limitada ao lead enviado em `formulario-escalamed.x5med.com.br`.

## 2026-10-02 — Novo cadastro após a conclusão

- Após a confirmação da inscrição, o formulário remove o rascunho, o identificador persistido e os cookies acessíveis pelo navegador.
- A tela de sucesso da inscrição gratuita oferece a ação `Cadastrar outra pessoa`, que abre um formulário vazio com um novo identificador de lead.
- O campo de nome remove números durante a digitação, e a API rejeita tentativas de envio com números no nome.
- O cupom `Jimi` libera a inscrição gratuita e aceita variações de maiúsculas, minúsculas, acentos e espaços.

## 2026-09-29 — Contato para continuidade da inscrição

- O texto opcional do WhatsApp agora informa que a equipe X5 Med entrará em contato para dar continuidade à inscrição no evento.
- A mesma frase é enviada ao Metrics para compor a evidência do aceite.

## 2026-09-21 — Novo cupom EscalaMed

- O cupom `EscalaMed` libera a inscrição gratuita e aceita variações de maiúsculas, minúsculas e espaços, incluindo `Escala Med`. Quando uma variação válida é reconhecida, o campo a corrige automaticamente para o formato oficial.

## 2026-09-18 — Captura de respostas parciais

- O formulário salva respostas parciais no Metrics em segundo plano após sair do campo ou parar de digitar.
- O mesmo identificador é reutilizado ao voltar e na conclusão, atualizando o lead já iniciado.

## 2026-09-18 — Inscrição em página única

- Todas as perguntas aparecem no formulário principal. O investimento de R$ 2.497,00 fica em destaque.
- Cupons de convite válidos concluem a inscrição gratuitamente; sem cupom, o participante segue para o checkout da Eduzz após o registro no Metrics.
- A opção de receber marketing por WhatsApp continua desmarcada e não é obrigatória.

## 2026-09-18 — Consentimento opcional de WhatsApp

- A segunda etapa da candidatura exibe o opt-in de marketing desmarcado e um link para a Política de Privacidade. A escolha não bloqueia a candidatura.
- Apenas a conclusão envia a decisão ao endpoint autenticado do Metrics, com ID da candidatura, URL da página e texto integral do aceite. O registro de início e o fluxo de confirmação continuam iguais.
