import { NextResponse } from "next/server";

import { syncLeadToMetrics, type MetricsLeadPayload } from "@/lib/metrics";
import { WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";

export const runtime = "nodejs";

type Payload = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function validPhone(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

function validInstagram(value: string) {
  return /^[A-Za-z0-9._]{1,30}$/.test(value);
}

const roles = new Set(["doctor", "owner-manager", "other"]);
const revenueRanges = new Set(["under-40k", "40k-70k", "70k-100k", "over-100k"]);

async function readPayload(request: Request): Promise<Payload | null> {
  try {
    return (await request.json()) as Payload;
  } catch {
    return null;
  }
}

function metricsPayload(id: string, payload: Payload, status: "started" | "completed", currentStep: number): MetricsLeadPayload {
  return {
    sourceLeadId: id,
    name: text(payload.name, 120),
    email: text(payload.email, 180).toLowerCase(),
    phone: text(payload.phone, 30),
    instagram: text(payload.instagram, 120).replace(/^@/, ""),
    role: text(payload.role, 40) || null,
    otherRole: text(payload.otherRole, 160) || null,
    crm: text(payload.crm, 40) || null,
    specialty: text(payload.specialty, 120) || null,
    city: text(payload.city, 120) || null,
    clinic: text(payload.clinic, 160) || null,
    revenueRange: text(payload.revenueRange, 40) || null,
    teamSize: text(payload.teamSize, 40) || null,
    mainDifficulty: text(payload.mainDifficulty, 1200) || null,
    objective: text(payload.objective, 1200) || null,
    bottleneck: text(payload.bottleneck, 1200) || null,
    ...(status === "completed" ? {
      whatsappConsent: payload.whatsappConsent === true,
      consentText: WHATSAPP_MARKETING_CONSENT_TEXT,
      pageUrl: text(payload.pageUrl, 500),
      formSubmissionId: id,
    } : {}),
    status,
    currentStep,
    utmSource: text(payload.utmSource, 120) || null,
    utmMedium: text(payload.utmMedium, 120) || null,
    utmCampaign: text(payload.utmCampaign, 180) || null,
    referrer: text(payload.referrer, 500) || null,
  };
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!payload) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const id = crypto.randomUUID();
  if (text(payload.companyWebsite, 100)) return NextResponse.json({ id });

  const lead = metricsPayload(id, payload, "started", 2);
  if (lead.name.length < 3 || !isEmail(lead.email) || !validPhone(lead.phone) || !validInstagram(lead.instagram)) {
    return NextResponse.json({ error: "Revise nome, e-mail, WhatsApp e Instagram." }, { status: 400 });
  }

  try {
    await syncLeadToMetrics(lead);
  } catch (error) {
    console.error("[leads POST] Metrics sync failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível registrar a candidatura no Metrics. Tente novamente." }, { status: 502 });
  }

  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const payload = await readPayload(request);
  if (!payload) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const id = text(payload.id, 80);
  if (!id) return NextResponse.json({ error: "Candidatura não encontrada." }, { status: 400 });
  if (text(payload.companyWebsite, 100)) return NextResponse.json({ id });

  const step = Math.min(4, Math.max(1, Number(payload.currentStep) || 1));
  const status = payload.status === "completed" ? "completed" : "started";
  const lead = metricsPayload(id, payload, status, step);
  if (lead.name.length < 3 || !isEmail(lead.email) || !validPhone(lead.phone) || !validInstagram(lead.instagram)) {
    return NextResponse.json({ error: "Revise nome, e-mail, WhatsApp e Instagram." }, { status: 400 });
  }

  if (status === "completed") {
    const legacyRequired = [lead.crm, lead.specialty, lead.city, lead.clinic, lead.revenueRange, lead.teamSize, lead.mainDifficulty, lead.objective, lead.bottleneck];
    const validNewAnswers = roles.has(lead.role || "") && revenueRanges.has(lead.revenueRange || "") && (lead.role !== "other" || (lead.otherRole?.length || 0) >= 2);
    const validLegacyAnswers = !lead.role && legacyRequired.every(Boolean);
    if ((!validNewAnswers && !validLegacyAnswers) || typeof payload.whatsappConsent !== "boolean" || !/^https?:\/\//i.test(lead.pageUrl || "")) {
      return NextResponse.json({ error: "Preencha todas as etapas antes de concluir." }, { status: 400 });
    }
  }

  try {
    await syncLeadToMetrics(lead);
  } catch (error) {
    console.error("[leads PATCH] Metrics sync failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível atualizar a candidatura no Metrics. Tente novamente." }, { status: 502 });
  }
  return NextResponse.json({ id });
}
