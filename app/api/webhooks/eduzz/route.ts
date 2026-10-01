import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EduzzItem = {
  productId?: string;
  name?: string;
  price?: { currency?: string; value?: number };
  coupon?: { key?: string } | null;
  isBump?: boolean;
};

type EduzzInvoicePaid = {
  id?: string;
  event?: string;
  sentDate?: string;
  data?: {
    id?: string;
    buyer?: {
      id?: string;
      email?: string;
      phone?: string;
      phone2?: string;
      cellphone?: string;
    };
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      term?: string;
    } | null;
    paid?: { currency?: string; value?: number };
    price?: { currency?: string; value?: number };
    items?: EduzzItem[];
    checkoutUrl?: string;
    paidAt?: string;
    paymentMethod?: string;
    transaction?: { id?: string; key?: string } | null;
  };
};

function secureSignature(rawBody: string, signature: string, secret: string) {
  const supplied = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function gaClientId(seed: string) {
  const digest = sha256(seed);
  return `${Number.parseInt(digest.slice(0, 8), 16)}.${Number.parseInt(digest.slice(8, 16), 16)}`;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function productMatches(items: EduzzItem[]) {
  const expectedProduct = process.env.EDUZZ_ESCALAMED_PRODUCT_ID?.trim();
  return !expectedProduct || items.some((item) => item.productId === expectedProduct);
}

async function sendGa4Purchase(payload: {
  transactionId: string;
  invoiceId: string;
  buyerId: string;
  currency: string;
  value: number;
  coupon: string;
  paymentMethod: string;
  utm: NonNullable<EduzzInvoicePaid["data"]>["utm"];
  items: EduzzItem[];
}) {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return { destination: "ga4", skipped: true };

  const response = await fetch(
    `https://region1.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: gaClientId(payload.buyerId || payload.invoiceId),
        user_id: payload.buyerId ? sha256(payload.buyerId) : undefined,
        events: [{
          name: "purchase",
          params: {
            transaction_id: payload.transactionId,
            affiliation: "Eduzz",
            currency: payload.currency,
            value: payload.value,
            coupon: payload.coupon || undefined,
            payment_method: payload.paymentMethod || undefined,
            campaign_source: payload.utm?.source || undefined,
            campaign_medium: payload.utm?.medium || undefined,
            campaign_name: payload.utm?.campaign || undefined,
            campaign_content: payload.utm?.content || undefined,
            campaign_term: payload.utm?.term || undefined,
            engagement_time_msec: 1,
            items: payload.items.map((item, index) => ({
              item_id: item.productId || `escalamed-${index + 1}`,
              item_name: item.name || "EscalaMED 2026",
              item_category: item.isBump ? "Order bump" : "Imersão presencial",
              price: item.price?.value,
              quantity: 1,
              coupon: item.coupon?.key || undefined,
            })),
          },
        }],
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`GA4 recusou o evento (${response.status}).`);
  return { destination: "ga4", skipped: false };
}

async function sendMetaPurchase(payload: {
  eventId: string;
  eventTime: number;
  email: string;
  phone: string;
  buyerId: string;
  sourceUrl: string;
  currency: string;
  value: number;
  items: EduzzItem[];
}) {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN?.trim();
  if (!pixelId || !accessToken) return { destination: "meta", skipped: true };

  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v24.0";
  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "Purchase",
          event_time: payload.eventTime,
          event_id: payload.eventId,
          action_source: "website",
          event_source_url: payload.sourceUrl || undefined,
          user_data: {
            em: payload.email ? [sha256(payload.email)] : undefined,
            ph: payload.phone ? [sha256(normalizePhone(payload.phone))] : undefined,
            external_id: payload.buyerId ? [sha256(payload.buyerId)] : undefined,
          },
          custom_data: {
            currency: payload.currency,
            value: payload.value,
            content_type: "product",
            content_ids: payload.items.map((item) => item.productId).filter(Boolean),
            contents: payload.items.map((item) => ({ id: item.productId, quantity: 1, item_price: item.price?.value })),
          },
        }],
        test_event_code: process.env.META_TEST_EVENT_CODE?.trim() || undefined,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Meta recusou o evento (${response.status}).`);
  return { destination: "meta", skipped: false };
}

export async function POST(request: Request) {
  const secret = process.env.EDUZZ_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[eduzz webhook] EDUZZ_WEBHOOK_SECRET não configurada.");
    return NextResponse.json({ error: "Webhook indisponível." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") || "";
  if (!secureSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: EduzzInvoicePaid;
  try {
    payload = JSON.parse(rawBody) as EduzzInvoicePaid;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (payload.event !== "myeduzz.invoice_paid") {
    return NextResponse.json({ ok: true, ignored: true, event: payload.event || "unknown" });
  }

  const invoice = payload.data;
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  if (!invoice?.id || !productMatches(items)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "product_filter" });
  }
  const purchaseItems = items.length ? items : [{
    productId: "escalamed-2026",
    name: "EscalaMED 2026",
    price: { currency: invoice.paid?.currency || invoice.price?.currency || "BRL", value: invoice.paid?.value ?? invoice.price?.value ?? 2497 },
  }];

  const transactionId = invoice.transaction?.id || invoice.id;
  const currency = invoice.paid?.currency || invoice.price?.currency || "BRL";
  const value = invoice.paid?.value ?? invoice.price?.value ?? 2497;
  const email = invoice.buyer?.email || "";
  const phone = invoice.buyer?.cellphone || invoice.buyer?.phone || invoice.buyer?.phone2 || "";
  const buyerId = invoice.buyer?.id || email || invoice.id;
  const coupon = purchaseItems.find((item) => item.coupon?.key)?.coupon?.key || "";
  const eventTime = Math.floor((Date.parse(invoice.paidAt || payload.sentDate || "") || Date.now()) / 1000);

  const deliveries = await Promise.allSettled([
    sendGa4Purchase({
      transactionId,
      invoiceId: invoice.id,
      buyerId,
      currency,
      value,
      coupon,
      paymentMethod: invoice.paymentMethod || "",
      utm: invoice.utm,
      items: purchaseItems,
    }),
    sendMetaPurchase({
      eventId: transactionId,
      eventTime,
      email,
      phone,
      buyerId,
      sourceUrl: invoice.checkoutUrl || "",
      currency,
      value,
      items: purchaseItems,
    }),
  ]);

  const failures = deliveries.filter((delivery) => delivery.status === "rejected");
  if (failures.length) {
    failures.forEach((failure) => {
      if (failure.status === "rejected") console.error("[eduzz webhook] delivery failed", failure.reason);
    });
    return NextResponse.json({ error: "Falha ao entregar a conversão." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    transactionId,
    deliveries: deliveries.map((delivery) => delivery.status === "fulfilled" ? delivery.value : null),
  });
}

