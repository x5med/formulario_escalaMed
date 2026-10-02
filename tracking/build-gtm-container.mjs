import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  throw new Error("Uso: node tracking/build-gtm-container.mjs <export.json> <destino.json>");
}

const source = JSON.parse(await readFile(resolve(sourceArg), "utf8"));
const version = source.containerVersion;

const eventNames = [
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
];

const googleAdsConversionId = "18388336415";
const googleAdsLeadLabel = "IpNLCIzqh4wdEJ_-nsBE";
const metaPixelId = "1436597411907868";

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
  "currency",
  "value",
  "method",
  "coupon",
];

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

version.name = "Tracking completo EscalaMED";
version.description = "Funil EscalaMED em GA4, Google Ads e Meta. Purchase é enviado pelo webhook assinado da Eduzz para GA4 Measurement Protocol e Meta Conversions API.";
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
    name: "CE | EscalaMED | Eventos do funil",
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
  },
];

version.tag = [
  ...(version.tag || []).filter(
    (tag) =>
      ![
        "Google Ads | Conversion Linker | Todas as páginas",
        "GA4 | EscalaMED | Eventos do funil",
        "Meta | EscalaMED | Base + PageView",
        "Meta | EscalaMED | Eventos do funil",
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
    firingTriggerId: ["2147479553"],
    tagFiringOption: "ONCE_PER_EVENT",
    monitoringMetadata: { type: "MAP" },
    consentSettings: { consentStatus: "NOT_SET" },
  },
  {
    accountId: version.accountId,
    containerId: version.containerId,
    tagId: "6",
    name: "GA4 | EscalaMED | Eventos do funil",
    type: "gaawe",
    parameter: [
      { type: "BOOLEAN", key: "sendEcommerceData", value: "true" },
      { type: "TEMPLATE", key: "getEcommerceDataFrom", value: "dataLayer" },
      { type: "TEMPLATE", key: "eventName", value: "{{Event}}" },
      { type: "TEMPLATE", key: "measurementIdOverride", value: "G-72KF9X3YP4" },
      { type: "LIST", key: "eventParameters", list: dataLayerVariables.map(eventParameter) },
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
    name: "Meta | EscalaMED | Base + PageView",
    type: "html",
    parameter: [
      {
        type: "TEMPLATE",
        key: "html",
        value: `<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\nfbq('init','${metaPixelId}');\nfbq('track','PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" /></noscript>`,
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
    name: "Meta | EscalaMED | Eventos do funil",
    type: "html",
    parameter: [
      {
        type: "TEMPLATE",
        key: "html",
        value: "<script>var e='{{Event}}';var m={generate_lead:'Lead',sign_up:'CompleteRegistration',begin_checkout:'InitiateCheckout'}[e];if(m&&window.fbq){fbq('track',m,{content_name:'EscalaMED'});}</script>",
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
