import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { leads } from "@/db/schema";

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
  await getDb().insert(leads).values({
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
  });

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

  await getDb().update(leads).set(updates).where(eq(leads.id, id));
  return NextResponse.json({ id });
}
