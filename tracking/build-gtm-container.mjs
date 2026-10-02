import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  throw new Error("Uso: node tracking/build-gtm-container.mjs <export.json> <destino.json>");
}

const source = JSON.parse(await readFile(resolve(sourceArg), "utf8"));
const version = source.containerVersion;

const eventNames = [
  "lp_view",
  "cta_click",
  "diagnosis_select",
  "scroll_depth",
  "section_view",
  "map_click",
  "video_start",
  "form_start",
  "form_error",
  "coupon_applied",
  "generate_lead",
  "sign_up",
  "begin_checkout",
  "form_submit",
  "offer_unlocked",
  "checkout_redirect",
];

const googleAdsConversionId = "18388336415";
const googleAdsLeadLabel = "IpNLCIzqh4wdEJ_-nsBE";
const metaRoutingScript = `var h=location.hostname,p=location.pathname;var c={id:'649336017630453',name:'X5 Med'};
if(h==='escalamed.x5med.com.br'||h==='formulario-escalamed.x5med.com.br'){c={id:'1436597411907868',name:'EscalaMED'};}
else if(h==='secretaria.x5med.com.br'){c={id:'963386376745748',name:'Secretária Médica de Alta Performance'};}
else if(h==='masterclass-precificacao.x5med.com.br'||h==='precificacao.x5med.com.br'){c={id:'1736956867587094',name:'Precificação X5 Med'};}
else if(h==='imersao.x5med.cloud'){c={id:'4697356290547354',name:'Imersão X5 Med Online'};}
else if(h==='link-tree.x5med.com.br'){c={id:'976163941833350',name:'Linktree X5 Med'};}
else if(h==='obrigado.x5med.com.br'){
  if(p.indexOf('/secretaria')===0)c={id:'963386376745748',name:'Secretária Médica de Alta Performance'};
  else if(p.indexOf('/masterclass')===0||p.indexOf('/precificacao')===0)c={id:'1736956867587094',name:'Precificação X5 Med'};
  else if(p.indexOf('/escalamed')===0)c={id:'1436597411907868',name:'EscalaMED'};
}`;

const dataLayerVariables = [
  "cta_position",
  "cta_label",
  "destination_url",
  "percent_scrolled",
  "section_id",
  "section_title",
  "location_name",
  "diagnosis_item",
  "diagnosis_index",
  "video_id",
  "video_title",
  "video_position",
  "form_id",
  "form_name",
  "lead_id",
  "error_field",
  "error_message",
  "error_type",
  "coupon_code",
  "coupon_valid",
  "lead_type",
  "cargo",
  "faixa_faturamento",
  "has_coupon",
  "currency",
  "value",
  "method",
  "coupon",
  "checkout_provider",
  "consent_choice",
  "user_data.email_address",
  "user_data.phone_number",
];

const ga4EventParameters = dataLayerVariables.filter((name) => !name.startsWith("user_data."));

const dataLayerVariable = (name, index) => ({
  accountId: version.accountId,
  containerId: version.containerId,
  variableId: String(10 + index),
  name: `DLV | ${name}`,
  type: "v",
  parameter: [
    { type: "INTEGER", key: "dataLayerVersion", value: "2" },
    { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
    { type: "TEMPLATE", key: "name", value: name },
  ],
});

const eventParameter = (name) => ({
  type: "MAP",
  map: [
    { type: "TEMPLATE", key: "name", value: name },
    { type: "TEMPLATE", key: "value", value: `{{DLV | ${name}}}` },
  ],
});

const adConsentSettings = {
  consentStatus: "NEEDED",
  consentType: {
    type: "LIST",
    list: [
      { type: "TEMPLATE", value: "ad_storage" },
      { type: "TEMPLATE", value: "ad_user_data" },
    ],
  },
};

version.name = "Tracking X5 Med | Landing pages";
version.description = "GA4 compartilhado e Meta roteado por domínio para EscalaMED, Secretária, Precificação, Bioma e Imersão. Google Ads permanece restrito ao lead do EscalaMED.";
delete version.path;
delete version.containerVersionId;
delete version.fingerprint;
delete version.tagManagerUrl;

version.variable = dataLayerVariables.map(dataLayerVariable);
version.trigger = [
  {
    accountId: version.accountId,
    containerId: version.containerId,
    triggerId: "5",
    name: "CE | X5 Med | Eventos dos funis",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "MATCH_REGEX",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: `^(${eventNames.join("|")})$` },
        ],
      },
    ],
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    triggerId: "6",
    name: "CE | Google Ads | generate_lead",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "generate_lead" },
        ],
      },
    ],
    filter: [
      {
        type: "MATCH_REGEX",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{Page Hostname}}" },
          { type: "TEMPLATE", key: "arg1", value: "^(formulario-escalamed\\.x5med\\.com\\.br)$" },
        ],
      },
    ],
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    triggerId: "7",
    name: "CE | Consentimento | Aceito",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "consent_update" },
        ],
      },
    ],
    filter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{DLV | consent_choice}}" },
          { type: "TEMPLATE", key: "arg1", value: "accepted" },
        ],
      },
    ],
  },
];

const baseGa4Tag = (version.tag || []).find((tag) => tag.name === "GA4 | EscalaMED | Todas as páginas");
if (baseGa4Tag) baseGa4Tag.name = "GA4 | X5 Med | Todas as páginas";

version.tag = [
  ...(version.tag || []).filter(
    (tag) =>
      ![
        "Google Ads | Conversion Linker | Todas as páginas",
        "GA4 | EscalaMED | Eventos do funil",
        "GA4 | X5 Med | Eventos dos funis",
        "Meta | EscalaMED | Base + PageView",
        "Meta | X5 Med | Base + PageView por domínio",
        "Meta | EscalaMED | Eventos do funil",
        "Meta | X5 Med | Eventos dos funis por domínio",
        "Tag do Google AW-18388336415",
        "Inscrição",
      ].includes(tag.name),
  ),
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "5",
    name: "Google Ads | Conversion Linker | Todas as páginas",
    type: "gclidw",
    firingTriggerId: ["2147479553", "7"],
    tagFiringOption: "ONCE_PER_LOAD",
    monitoringMetadata: { type: "MAP" },
    consentSettings: { consentStatus: "NOT_SET" },
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "6",
    name: "GA4 | X5 Med | Eventos dos funis",
    type: "gaawe",
    parameter: [
      { type: "BOOLEAN", key: "sendEcommerceData", value: "true" },
      { type: "TEMPLATE", key: "getEcommerceDataFrom", value: "dataLayer" },
      { type: "TEMPLATE", key: "eventName", value: "{{Event}}" },
      { type: "TEMPLATE", key: "measurementIdOverride", value: "G-72KF9X3YP4" },
      { type: "LIST", key: "eventParameters", list: ga4EventParameters.map(eventParameter) },
    ],
    firingTriggerId: ["5"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: { consentStatus: "NOT_SET" },
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "7",
    name: "Meta | X5 Med | Base + PageView por domínio",
    type: "html",
    parameter: [
      {
        type: "TEMPLATE",
        key: "html",
        value: `<script>\n(function(){${metaRoutingScript}\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init',c.id);fbq('track','PageView',{content_name:c.name});})();\n</script>`,
      },
      { type: "BOOLEAN", key: "supportDocumentWrite", value: "false" },
    ],
    firingTriggerId: ["2147479553"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: adConsentSettings,
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "8",
    name: "Meta | X5 Med | Eventos dos funis por domínio",
    type: "html",
    parameter: [
      {
        type: "TEMPLATE",
        key: "html",
        value: `<script>(function(){${metaRoutingScript}\nvar e='{{Event}}';var m={generate_lead:'Lead',sign_up:'CompleteRegistration',begin_checkout:'InitiateCheckout'}[e];if(m&&window.fbq){var em='{{DLV | user_data.email_address}}';var ph='{{DLV | user_data.phone_number}}';if(em||ph){var ud={};if(em)ud.em=em;if(ph)ud.ph=ph;fbq('init',c.id,ud);}fbq('track',m,{content_name:c.name,value:Number('{{DLV | value}}')||0,currency:'{{DLV | currency}}'||'BRL'});}})();</script>`,
      },
      { type: "BOOLEAN", key: "supportDocumentWrite", value: "false" },
    ],
    firingTriggerId: ["5"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: adConsentSettings,
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "9",
    name: `Tag do Google AW-${googleAdsConversionId}`,
    type: "googtag",
    parameter: [
      { type: "TEMPLATE", key: "tagId", value: `AW-${googleAdsConversionId}` },
    ],
    firingTriggerId: ["2147479573"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: { consentStatus: "NOT_SET" },
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "10",
    name: "Inscrição",
    type: "awct",
    parameter: [
      { type: "TEMPLATE", key: "conversionId", value: googleAdsConversionId },
      { type: "TEMPLATE", key: "conversionLabel", value: googleAdsLeadLabel },
      { type: "TEMPLATE", key: "conversionValue", value: "{{DLV | value}}" },
      { type: "TEMPLATE", key: "currencyCode", value: "{{DLV | currency}}" },
    ],
    firingTriggerId: ["6"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: { consentStatus: "NOT_SET" },
  },
];

await writeFile(resolve(destinationArg), `${JSON.stringify(source, null, 2)}\n`, "utf8");
