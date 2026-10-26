# Telefone, atribuição e eventos — auditoria de 26/10/2026

## WhatsApp

`lib/phone.ts` é a normalização compartilhada pela máscara, validação, API e tracking. O campo mostra `+55` fixo. Colar `5511999998888`, `11 99999-8888` ou `(11) 99999-8888` resulta em `(11) 99999-8888`, chave nacional `11999998888` no Metrics e `user_data.phone_number: "+5511999998888"` no dataLayer. DDD 55 nacional não é confundido com DDI; entradas excessivas não são cortadas silenciosamente.

## Checkout e origem

`lib/tracking.ts::readAttribution` lê o JSON `sessionStorage.x5_click_params` do GTM. Precedência: parâmetros da URL atual > sessão do GTM > armazenamento legado `escalamed-attribution-v1`. Valores capturados codificados pelo GTM v14 são decodificados uma vez e serializados por `URLSearchParams`, evitando dupla codificação.

`decorateUrl` adiciona `fbclid`, `gclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` (e os bridges Google já suportados) sem sobrescrever parâmetros existentes do checkout. O destino decorado é calculado antes da limpeza de cookies e usado tanto no redirecionamento programático quanto no link alternativo. A tag de decoração de links do GTM não cobria `window.location.assign`.

## Origem dos eventos Meta

Auditoria do container **GTM-M4GT66JQ publicado, versão 14**, e do código da LP:

| Meta | Origem | Regra |
| --- | --- | --- |
| `Lead` | Tag Meta **98** do GTM, acionada por `generate_lead` | Uma emissão por ID de envio concluído e aceito pela API, pago ou gratuito. Rascunhos e erros não emitem. |
| `CompleteRegistration` | Tag Meta **64** do GTM, acionada por `sign_up` | Somente resposta gratuita da API **e** cupom reconhecido. Nunca no caminho de pagamento pendente. |
| `QualifiedLead` | CAPI no Metrics, não encontrada no GTM nem como `fbq` direto na LP | Transição de etapa conforme configuração do CRM e autorização específica de compartilhamento. Ver regra abaixo. |

O emissor da LP é `components/application-form.tsx::finishSubmission`. Ele protege a conclusão contra repetição do mesmo ID; o botão também bloqueia envios simultâneos. `begin_checkout` permanece separado, mapeado a `InitiateCheckout`, e não significa inscrição confirmada ou compra.

Não foi encontrado emissor direto de `CompleteRegistration` fora do GTM nos códigos auditados. O arquivo `GTM-M4GT66JQ_tracking.json` e seu gerador são uma referência histórica, diferente do container v14 publicado; não devem ser importados sobre a versão atual. Configurações externas do Gerenciador de Eventos não foram alteradas. Os testes verificam emissões da aplicação; não comprovam contagem/atribuição posterior na interface da Meta.

## QualifiedLead no Metrics

Fluxo: `crm_meta_capi_enqueue_history` (SQL) → outbox → `processCapi` → `src/lib/meta-capi/server.ts::sendCapiEvent` → Graph API.

Regra corrigida em 26/10: entrada efetiva na etapa **Qualificação** (`2dc6b980-dec3-4fb1-8df6-99b5e9212f5d`) do funil **Imersão EscalaMED** (`37d22918-499b-4835-8e75-ed30270a555e`), com autorização específica para compartilhar dados com a Meta, identificadores correspondentes e integração ativa no momento da transição. O estágio de qualificação é a regra operacional; não se inventa corte de faturamento nem se considera o simples clique no aceite como qualificação. Mudanças de cadastro e rascunhos não bastam.

A auditoria encontrou a CAPI **desativada** e `QualifiedLead` configurado incorretamente para Tráfego pago / Em conversa. A correção mantém a integração desativada, preserva `LeadConfirmed` e não reprocessa inscrições anteriores. A ativação exige ação própria do administrador; a correção não a executa. IDs estáveis no outbox preservam deduplicação.

## Verificação

`node --test tests/application-validation.test.mjs tests/meta-capi-consent.test.mjs tests/tracking-attribution.test.mjs`

Os testes executam normalização, API com destino de teste e callback real de conclusão do componente: envio comum = um `generate_lead`, zero `sign_up`; cupom válido = um de cada; callback repetido não duplica; checkout recebe parâmetros e navega uma única vez.
