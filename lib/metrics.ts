const DEFAULT_METRICS_URL = "https://metrics.x5med.com.br/api/endomax/integrations/escalamed-application";

export type MetricsLeadPayload = {
  sourceLeadId: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  role?: string | null;
  otherRole?: string | null;
  crm?: string | null;
  specialty?: string | null;
  city?: string | null;
  clinic?: string | null;
  revenueRange?: string | null;
  teamSize?: string | null;
  mainDifficulty?: string | null;
  objective?: string | null;
  bottleneck?: string | null;
  consent?: boolean;
  status: "started" | "completed";
  currentStep: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
};

export async function syncLeadToMetrics(payload: MetricsLeadPayload) {
  const key = process.env.ESCALAMED_FORM_INGEST_KEY || "";
  const endpoint = process.env.METRICS_FORM_INGEST_URL || DEFAULT_METRICS_URL;
  if (!key) throw new Error("ESCALAMED_FORM_INGEST_KEY não configurada.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-escalamed-key": key,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Metrics recusou a sincronização (${response.status}).`);
    }
    return await response.json() as { ok: true; leadId: string; funnelId: string; stage: string };
  } finally {
    clearTimeout(timeout);
  }
}
