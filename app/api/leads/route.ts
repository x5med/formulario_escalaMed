import { NextResponse } from "next/server";

import { WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";
import { normalizeCoupon } from "@/lib/coupons";
import { syncLeadToMetrics, type MetricsLeadPayload } from "@/lib/metrics";

export const runtime = "nodejs";

type Payload = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const roles = new Set(["doctor", "owner-manager", "other"]);
const revenueRanges = new Set(["under-40k", "40k-70k", "70k-100k", "over-100k"]);

function metricsPayload(id: string, payload: Payload, couponCode: string | null): MetricsLeadPayload {
  return {
    sourceLeadId: id,
    name: text(payload.name, 120),
    email: text(payload.email, 180).toLowerCase(),
    phone: text(payload.phone, 30),
    instagram: text(payload.instagram, 120).replace(/^@/, ""),
    role: text(payload.role, 40) || null,
    otherRole: text(payload.otherRole, 160) || null,
    revenueRange: text(payload.revenueRange, 40) || null,
    consent: payload.whatsappConsent === true,
    whatsappConsent: payload.whatsappConsent === true,
    consentText: WHATSAPP_MARKETING_CONSENT_TEXT,
    pageUrl: text(payload.pageUrl, 500),
    formSubmissionId: id,
    status: "completed",
    currentStep: 1,
    couponCode,
    registrationType: couponCode ? "complimentary" : "payment_pending",
    priceCents: 249700,
    utmSource: text(payload.utmSource, 120) || null,
    utmMedium: text(payload.utmMedium, 120) || null,
    utmCampaign: text(payload.utmCampaign, 180) || null,
    referrer: text(payload.referrer, 500) || null,
  };
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid payload");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const couponInput = text(payload.couponCode, 80);
  const couponCode = couponInput ? normalizeCoupon(couponInput) : null;
  if (couponInput && !couponCode) {
    return NextResponse.json({ error: "Cupom não reconhecido. Confira o código ou remova-o para continuar com a inscrição paga.", field: "couponCode" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  if (text(payload.companyWebsite, 100)) return NextResponse.json({ id, access: "free" });

  const lead = metricsPayload(id, payload, couponCode);
  const validIdentity = lead.name.length >= 3 && /^\S+@\S+\.\S+$/.test(lead.email)
    && lead.phone.replace(/\D/g, "").length >= 10
    && /^[A-Za-z0-9._]{1,30}$/.test(lead.instagram);
  const validAnswers = roles.has(lead.role || "") && revenueRanges.has(lead.revenueRange || "")
    && (lead.role !== "other" || (lead.otherRole?.length || 0) >= 2);
  if (!validIdentity || !validAnswers || typeof payload.whatsappConsent !== "boolean" || !/^https?:\/\//i.test(lead.pageUrl || "")) {
    return NextResponse.json({ error: "Revise todos os campos obrigatórios antes de concluir." }, { status: 400 });
  }

  // O destino do pagamento é fixado no servidor e nunca aceito do navegador.
  const checkoutUrl = "https://chk.eduzz.com/1W3223YQ92";

  try {
    await syncLeadToMetrics(lead);
  } catch (error) {
    console.error("[leads POST] Metrics sync failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível registrar sua inscrição. Tente novamente." }, { status: 502 });
  }

  return NextResponse.json(
    couponCode ? { id, access: "free" } : { id, access: "paid", checkoutUrl },
    { status: 201 },
  );
}

// Versões antigas da página não conhecem o redirecionamento para pagamento.
export async function PATCH() {
  return NextResponse.json({ error: "Atualize a página para usar o novo formulário de inscrição." }, { status: 409 });
}
