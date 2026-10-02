export const GTM_ID = "GTM-M4GT66JQ";
export const FORM_ID = "escalamed-registration-2026";
export const FORM_NAME = "Inscrição EscalaMED 2026";
export const PRODUCT_VALUE = 2497;
export const PRODUCT_ITEM = {
  item_id: "escalamed-2026",
  item_name: "EscalaMED 2026",
  item_category: "Imersão presencial",
  price: PRODUCT_VALUE,
  quantity: 1,
};

export const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "wbraid",
  "gbraid",
] as const;

export type AttributionKey = (typeof attributionKeys)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;
type DataLayerWindow = Window & { dataLayer?: unknown[] };

const attributionStorageKey = "escalamed-attribution-v1";

function canPersistAttribution() {
  return document.cookie.includes("x5med_consent=accepted");
}

export function readAttribution(): Attribution {
  const current: Attribution = {};
  const params = new URLSearchParams(window.location.search);
  attributionKeys.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) current[key] = value;
  });

  let stored: Attribution = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(attributionStorageKey) || "{}") as Attribution;
  } catch {
    stored = {};
  }

  const attribution = { ...stored, ...current };
  if (canPersistAttribution() && Object.keys(attribution).length) {
    try {
      sessionStorage.setItem(attributionStorageKey, JSON.stringify(attribution));
    } catch {
      // A inscrição continua mesmo quando o armazenamento local está indisponível.
    }
  }
  return attribution;
}

export function decorateUrl(url: string, attribution: Attribution = readAttribution()) {
  const destination = new URL(url);
  attributionKeys.forEach((key) => {
    const value = attribution[key];
    if (value && !destination.searchParams.has(key)) destination.searchParams.set(key, value);
  });
  return destination.toString();
}

export function pushTrackingEvent(event: string, payload: Record<string, unknown> = {}) {
  const currentWindow = window as DataLayerWindow;
  currentWindow.dataLayer ||= [];
  currentWindow.dataLayer.push({ event, ...payload });
}

export function pushEcommerceEvent(event: string, payload: Record<string, unknown>) {
  const currentWindow = window as DataLayerWindow;
  currentWindow.dataLayer ||= [];
  currentWindow.dataLayer.push({ ecommerce: null });
  currentWindow.dataLayer.push({ event, ...payload });
}

export function trackAndNavigate(
  event: string,
  payload: Record<string, unknown>,
  destination: string,
  beforeNavigate?: () => void,
) {
  const currentWindow = window as DataLayerWindow;
  currentWindow.dataLayer ||= [];
  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    beforeNavigate?.();
    window.location.assign(destination);
  };
  currentWindow.dataLayer.push({
    ecommerce: null,
  });
  currentWindow.dataLayer.push({
    event,
    ...payload,
    eventCallback: navigate,
    eventTimeout: 900,
  });
  window.setTimeout(navigate, 950);
}

export function userData(email: string, phone: string) {
  return {
    email_address: email.trim().toLowerCase(),
    phone_number: phone.replace(/\D/g, "").replace(/^(?!55)/, "55"),
  };
}

