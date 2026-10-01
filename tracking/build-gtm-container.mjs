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

version.name = "Tracking completo EscalaMED";
version.description = "Eventos GA4 do funil EscalaMED, ecommerce begin_checkout e Conversion Linker. user_data não é enviado ao GA4.";
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
];

version.tag = [
  ...(version.tag || []),
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
];

await writeFile(resolve(destinationArg), `${JSON.stringify(source, null, 2)}\n`, "utf8");
