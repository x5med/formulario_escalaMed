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
  whatsappConsent?: boolean;
  consentText?: string;
  metaAdsConsent?: boolean;
  metaAdsConsentVersion?: string;
  pageUrl?: string;
  formSubmissionId?: string;
  couponCode?: string | null;
  registrationType?: "complimentary" | "payment_pending";
  priceCents?: number;
  status: "started" | "completed";
  currentStep: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  wbraid?: string | null;
  gbraid?: string | null;
  referrer?: string | null;
};

export class MetricsSyncError extends Error {
  constructor(public readonly needsReview: boolean) {
    super(needsReview
      ? 'Não foi possível confirmar sua inscrição. Seus dados precisam de conferência pela equipe X5 MED. Não houve confirmação das respostas deste envio.'
      : 'Não foi possível registrar sua inscrição. Tente novamente.');
    this.name = 'MetricsSyncError';
  }
}

type MetricsSyncResult = {
  ok: true;
  leadId: string | null;
  funnelId: string;
  stage: string | null;
  ignored?: boolean;
  profileOnly?: boolean;
  reason?: string;
  received?: boolean;
  submissionId?: string;
  processing?: 'applied' | 'review' | 'pending' | 'deleted';
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const result = await response.json().catch(() => null) as MetricsSyncResult | null;
    if (!response.ok) throw new MetricsSyncError(response.status === 409);
    // Check the semantic acknowledgement too: older Metrics versions return
    // HTTP 200 for ignored/review results. Never present them as success.
    const durable = payload.status === 'completed' && result?.ok === true && result.received === true
      && UUID_PATTERN.test(result.submissionId || '')
      && result.funnelId === '37d22918-499b-4835-8e75-ed30270a555e'
      && ['applied','review','pending','deleted'].includes(result.processing || '');
    if (durable) return result;
    const review = ['identity_review', 'review', 'provisional_review', 'deleted'].includes(result?.reason || '');
    if (review) throw new MetricsSyncError(true);
    if (result?.ok !== true || result.funnelId !== '37d22918-499b-4835-8e75-ed30270a555e'
      || (result.leadId !== null && !UUID_PATTERN.test(result.leadId || ''))
      || (payload.status === 'completed' && !result.leadId)) throw new MetricsSyncError(false);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
