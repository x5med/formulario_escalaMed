# Changelog

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
