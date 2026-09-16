import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { syncLeadToMetrics, type MetricsLeadPayload } from "@/lib/metrics";

export const runtime = "edge";

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

async function readPayload(request: Request): Promise<Payload | null> {
  try {
    return (await request.json()) as Payload;
  } catch {
    return null;
  }
}

function metricsPayload(lead: typeof leads.$inferSelect): MetricsLeadPayload {
  return {
    sourceLeadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    crm: lead.crm,
    specialty: lead.specialty,
    city: lead.city,
    clinic: lead.clinic,
    revenueRange: lead.revenueRange,
    teamSize: lead.teamSize,
    mainDifficulty: lead.mainDifficulty,
    objective: lead.objective,
    bottleneck: lead.bottleneck,
    consent: lead.consent,
    status: lead.status,
    currentStep: lead.currentStep,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    referrer: lead.referrer,
  };
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!payload) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const id = crypto.randomUUID();
  if (text(payload.companyWebsite, 100)) return NextResponse.json({ id });

  const name = text(payload.name, 120);
  const email = text(payload.email, 180).toLowerCase();
  const phone = text(payload.phone, 30);
  if (name.length < 3 || !isEmail(email) || !validPhone(phone)) {
    return NextResponse.json({ error: "Revise nome, e-mail e WhatsApp." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = getDb();
  const lead = {
    id,
    name,
    email,
    phone,
    status: "started",
    currentStep: 2,
    utmSource: text(payload.utmSource, 120) || null,
    utmMedium: text(payload.utmMedium, 120) || null,
    utmCampaign: text(payload.utmCampaign, 180) || null,
    referrer: text(payload.referrer, 500) || null,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof leads.$inferInsert;

  await db.insert(leads).values(lead);
  try {
    await syncLeadToMetrics(metricsPayload({
      ...lead,
      crm: null,
      specialty: null,
      city: null,
      clinic: null,
      revenueRange: null,
      teamSize: null,
      mainDifficulty: null,
      objective: null,
      bottleneck: null,
      consent: false,
      completedAt: null,
    }));
  } catch (error) {
    await db.delete(leads).where(eq(leads.id, id));
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

  const updates = {
    crm: text(payload.crm, 40) || null,
    specialty: text(payload.specialty, 120) || null,
    city: text(payload.city, 120) || null,
    clinic: text(payload.clinic, 160) || null,
    revenueRange: text(payload.revenueRange, 40) || null,
    teamSize: text(payload.teamSize, 40) || null,
    mainDifficulty: text(payload.mainDifficulty, 1200) || null,
    objective: text(payload.objective, 1200) || null,
    bottleneck: text(payload.bottleneck, 1200) || null,
    consent: payload.consent === true,
    status,
    currentStep: step,
    updatedAt: new Date().toISOString(),
    completedAt: status === "completed" ? new Date().toISOString() : null,
  } as const;

  if (status === "completed") {
    const required = [updates.crm, updates.specialty, updates.city, updates.clinic, updates.revenueRange, updates.teamSize, updates.mainDifficulty, updates.objective, updates.bottleneck];
    if (required.some((value) => !value) || !updates.consent) {
      return NextResponse.json({ error: "Preencha todas as etapas antes de concluir." }, { status: 400 });
    }
  }

  const [lead] = await getDb().update(leads).set(updates).where(eq(leads.id, id)).returning();
  if (!lead) return NextResponse.json({ error: "Candidatura não encontrada." }, { status: 404 });

  try {
    await syncLeadToMetrics(metricsPayload(lead));
  } catch (error) {
    console.error("[leads PATCH] Metrics sync failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível atualizar a candidatura no Metrics. Tente novamente." }, { status: 502 });
  }
  return NextResponse.json({ id });
}
