"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { RegistrationSuccess } from "@/components/registration-success";
import { META_CAPI_CONSENT_SUMMARY, META_CAPI_CONSENT_TEXT, WHATSAPP_EVENT_REGISTRATION_CONSENT_TEXT } from "@/lib/consent";
import { formatCouponInput, normalizeCoupon } from "@/lib/coupons";
import { formatPhoneInput } from "@/lib/phone";
import { APPLICATION_FIELDS, ApplicationValidationError, readApplicationErrors, validateApplication, VALIDATION_SUMMARY, type ApplicationField } from '@/lib/application-validation';
import {
  decorateUrl,
  FORM_ID,
  FORM_NAME,
  PRODUCT_ITEM,
  PRODUCT_VALUE,
  pushTrackingEvent,
  readAttribution,
  trackAndNavigate,
  userData,
} from "@/lib/tracking";

type ApplicationData = {
  name: string;
  email: string;
  phone: string;
  instagram: string;
  role: string;
  otherRole: string;
  revenueRange: string;
  couponCode: string;
  whatsappConsent: boolean;
  metaAdsConsent: boolean;
  companyWebsite: string;
};

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    },
    options?: { signal?: AbortSignal }
  ) => void | Promise<void>;
};

type SubmissionResult = { id: string; access: "free" | "paid"; checkoutUrl?: string; receiptId?: string; processing?: string };
type StoredDraft = { id: string; data: ApplicationData; updatedAt: number };

const DRAFT_STORAGE_KEY = "escalamed-registration-draft-v1";
const DRAFT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const roleTrackingLabels: Record<string, string> = {
  doctor: "Médico",
  "owner-manager": "Dono ou Gestor de clínica",
  other: "Outros",
};

const revenueTrackingLabels: Record<string, string> = {
  "under-40k": "< 40 mil",
  "40k-70k": "40 a 70 mil",
  "70k-100k": "70 a 100 mil",
  "over-100k": "> 100 mil",
};

const initialData: ApplicationData = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  role: "",
  otherRole: "",
  revenueRange: "",
  couponCode: "",
  whatsappConsent: true,
  metaAdsConsent: true,
  companyWebsite: "",
};

function hasAnswer(data: ApplicationData) {
  return [data.name, data.email, data.phone, data.instagram, data.role,
    data.otherRole, data.revenueRange, data.couponCode].some((value) => value.trim().length > 0);
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<StoredDraft>;
    if (!uuidPattern.test(saved.id || "") || typeof saved.updatedAt !== "number"
      || Date.now() - saved.updatedAt > DRAFT_MAX_AGE || !saved.data || typeof saved.data !== "object") return null;
    const data = { ...initialData };
    for (const key of Object.keys(initialData) as (keyof ApplicationData)[]) {
      const value = saved.data[key];
      if (key === "whatsappConsent") data.whatsappConsent = value === true;
      else if (key === 'metaAdsConsent') data.metaAdsConsent = false;
      else if (typeof value === "string") (data as unknown as Record<string, string>)[key] = value;
    }
    return { id: saved.id!, data, updatedAt: saved.updatedAt };
  } catch {
    return null;
  }
}

function storeDraft(id: string, data: ApplicationData) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ id, data: {...data, metaAdsConsent:false}, updatedAt: Date.now() }));
  } catch {
    // O envio ao Metrics continua mesmo quando o armazenamento local está indisponível.
  }
}

function clearRegistrationDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // A próxima inscrição ainda recebe um novo identificador em memória.
  }
}

function clearClientCookies() {
  const sharedDomain = location.hostname === "x5med.com.br" || location.hostname.endsWith(".x5med.com.br");
  document.cookie.split(";").forEach((entry) => {
    const name = entry.split("=", 1)[0]?.trim();
    if (!name) return;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    if (sharedDomain) document.cookie = `${name}=; Path=/; Domain=.x5med.com.br; Max-Age=0; SameSite=Lax`;
  });
}

function requestPayload(data: ApplicationData, id: string, completed: boolean) {
  const attribution = readAttribution();
  const { whatsappConsent, metaAdsConsent, ...answers } = data;
  return {
    ...answers,
    sourceLeadId: id,
    couponCode: data.couponCode.trim(),
    utmSource: attribution.utm_source || "",
    utmMedium: attribution.utm_medium || "",
    utmCampaign: attribution.utm_campaign || "",
    utmContent: attribution.utm_content || "",
    utmTerm: attribution.utm_term || "",
    gclid: attribution.gclid || "",
    fbclid: attribution.fbclid || "",
    wbraid: attribution.wbraid || "",
    gbraid: attribution.gbraid || "",
    referrer: document.referrer,
    pageUrl: window.location.href,
    ...(completed ? { whatsappConsent, metaAdsConsent } : {}),
  };
}

function validate(data: ApplicationData) {
  return validateApplication(data);
}

async function submitApplication(data: ApplicationData, id: string): Promise<SubmissionResult> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload(data, id, true)),
  });
  const result = await response.json() as SubmissionResult & { error?: string; errors?: unknown };
  if (!response.ok) {
    const fields = readApplicationErrors(result.errors);
    if (Object.keys(fields).length) throw new ApplicationValidationError(fields);
    throw new Error(result.error || 'O serviço de inscrições está indisponível no momento. Seus dados foram mantidos; tente novamente em instantes.');
  }
  if (result.access === "paid" && !result.checkoutUrl) throw new Error("O link de pagamento não está disponível. Tente novamente.");
  return result;
}

function FieldError({ field, children }: { field: ApplicationField; children?: string }) {
  if (!children) return null;
  return <p id={`${field}-error`} aria-live="polite" className="mt-1.5 text-xs font-medium text-[#B33D3D]">{children}</p>;
}

function focusApplicationField(field: string) {
  window.requestAnimationFrame(() => {
    const input = document.getElementById(field);
    if (!input) return;
    input.focus({ preventScroll: true });
    input.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  });
}

export function ApplicationForm() {
  const [data, setData] = useState<ApplicationData>(initialData);
  const [draftReady, setDraftReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [receiptId, setReceiptId] = useState('');
  const [processing, setProcessing] = useState('');
  const [paymentUrl, setPaymentUrl] = useState("");
  const leadIdRef = useRef("");
  const latestDataRef = useRef<ApplicationData>(initialData);
  const activeSaveRef = useRef<Promise<void> | null>(null);
  const pendingSaveRef = useRef<ApplicationData | null>(null);
  const lastSavedRef = useRef("");
  const submittingRef = useRef(false);
  const formStartedRef = useRef(false);
  const couponTrackedRef = useRef("");
  const trackedSubmissionsRef = useRef(new Set<string>());
  const coupon = normalizeCoupon(data.couponCode);

  const leadId = useCallback(() => {
    if (!leadIdRef.current) leadIdRef.current = crypto.randomUUID();
    return leadIdRef.current;
  }, []);

  const savePartial = useCallback((snapshot: ApplicationData): Promise<void> => {
    if (!hasAnswer(snapshot) || submittingRef.current) return activeSaveRef.current ?? Promise.resolve();
    const id = leadId();
    storeDraft(id, snapshot);
    const signature = JSON.stringify(snapshot);
    if (signature === lastSavedRef.current && !activeSaveRef.current) return Promise.resolve();
    pendingSaveRef.current = snapshot;
    if (activeSaveRef.current) return activeSaveRef.current;

    const task = (async () => {
      while (pendingSaveRef.current) {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const nextSignature = JSON.stringify(next);
        if (nextSignature === lastSavedRef.current) continue;
        const response = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload(next, id, false)),
        });
        if (!response.ok) throw new Error("Não foi possível salvar o rascunho.");
        lastSavedRef.current = nextSignature;
      }
    })();
    activeSaveRef.current = task;
    void task.finally(() => { activeSaveRef.current = null; }).catch(() => undefined);
    return task;
  }, [leadId]);

  const trackFormStart = useCallback(() => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    pushTrackingEvent("form_start", {
      form_id: FORM_ID,
      form_name: FORM_NAME,
      lead_id: leadId(),
    });
  }, [leadId]);

  const trackValidationError = useCallback((field: string, message: string, type = "validation") => {
    pushTrackingEvent("form_error", {
      form_id: FORM_ID,
      form_name: FORM_NAME,
      error_field: field,
      error_message: message,
      error_type: type,
    });
  }, []);

  const finishSubmission = useCallback((candidate: ApplicationData, result: SubmissionResult) => {
    if (trackedSubmissionsRef.current.has(result.id)) return;
    trackedSubmissionsRef.current.add(result.id);
    setReceiptId(result.receiptId || '');
    setProcessing(result.processing || '');
    const complimentary = result.access === "free";
    const trackingUserData = userData(candidate.email, candidate.phone);
    const normalizedCoupon = normalizeCoupon(candidate.couponCode) || "";
    pushTrackingEvent("generate_lead", {
      form_id: FORM_ID,
      form_name: FORM_NAME,
      lead_id: result.id,
      lead_type: complimentary ? "complimentary" : "payment_pending",
      cargo: roleTrackingLabels[candidate.role] || candidate.role,
      faixa_faturamento: revenueTrackingLabels[candidate.revenueRange] || candidate.revenueRange,
      has_coupon: Boolean(normalizedCoupon),
      currency: "BRL",
      value: complimentary ? 0 : PRODUCT_VALUE,
      user_data: trackingUserData,
    });

    clearRegistrationDraft();
    leadIdRef.current = "";
    pendingSaveRef.current = null;
    lastSavedRef.current = "";

    if (complimentary) {
      if (normalizedCoupon) pushTrackingEvent("sign_up", {
        method: "cupom_convite",
        form_id: FORM_ID,
        lead_id: result.id,
        coupon: normalizedCoupon,
        user_data: trackingUserData,
      });
      window.setTimeout(clearClientCookies, 0);
      setCompleted(true);
      return;
    }

    const checkoutUrl = decorateUrl(result.checkoutUrl!);
    setPaymentUrl(checkoutUrl);
    trackAndNavigate("begin_checkout", {
      form_id: FORM_ID,
      lead_id: result.id,
      currency: "BRL",
      value: PRODUCT_VALUE,
      coupon: normalizedCoupon,
      user_data: trackingUserData,
      ecommerce: {
        currency: "BRL",
        value: PRODUCT_VALUE,
        coupon: normalizedCoupon || undefined,
        items: [PRODUCT_ITEM],
      },
    }, checkoutUrl, clearClientCookies);
  }, []);

  const startAnotherRegistration = useCallback(() => {
    const next = { ...initialData };
    clearRegistrationDraft();
    clearClientCookies();
    leadIdRef.current = crypto.randomUUID();
    latestDataRef.current = next;
    activeSaveRef.current = null;
    pendingSaveRef.current = null;
    lastSavedRef.current = "";
    submittingRef.current = false;
    formStartedRef.current = false;
    couponTrackedRef.current = "";
    setData(next);
    setErrors({});
    setRequestError("");
    setLoading(false);
    setCompleted(false);
    setReceiptId('');
    setProcessing('');
    setPaymentUrl("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readStoredDraft();
      if (stored) {
        leadIdRef.current = stored.id;
        latestDataRef.current = stored.data;
        setData(stored.data);
      } else {
        leadId();
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [leadId]);

  useEffect(() => {
    if (!draftReady || loading || completed || paymentUrl || !hasAnswer(data)) return;
    const timeout = window.setTimeout(() => { void savePartial(data).catch(() => undefined); }, 700);
    return () => window.clearTimeout(timeout);
  }, [data, draftReady, loading, completed, paymentUrl, savePartial]);

  useEffect(() => {
    const retry = () => { void savePartial(latestDataRef.current).catch(() => undefined); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [savePartial]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(context.registerTool({
      name: "submit_escalamed_application",
      title: "Enviar inscrição EscalaMED",
      description: "Envia a inscrição; cupom válido dá acesso gratuito, sem cupom segue para pagamento.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 3, pattern: "^[^0-9]*$", description: "Nome completo sem números" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 10, description: "WhatsApp com DDD" },
          instagram: { type: "string", minLength: 1, description: "@ do Instagram" },
          role: { type: "string", enum: ["doctor", "owner-manager", "other"] },
          otherRole: { type: "string", description: "Obrigatório para o cargo Outros" },
          revenueRange: { type: "string", enum: ["under-40k", "40k-70k", "70k-100k", "over-100k"] },
          couponCode: { type: "string", description: "Cupom opcional para acesso gratuito" },
          whatsappConsent: { type: "boolean", const: true, description: "Autorização obrigatória para o contato de continuidade da inscrição pelo WhatsApp" },
        },
        required: ["name", "email", "phone", "instagram", "role", "revenueRange", "whatsappConsent"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== "object") throw new Error("Dados da inscrição inválidos.");
        const raw = input as Record<string, unknown>;
        const candidate: ApplicationData = {
          ...initialData,
          name: typeof raw.name === "string" ? raw.name.trim() : "",
          email: typeof raw.email === "string" ? raw.email.trim() : "",
          phone: typeof raw.phone === "string" ? raw.phone.trim() : "",
          instagram: typeof raw.instagram === "string" ? raw.instagram.trim() : "",
          role: typeof raw.role === "string" ? raw.role : "",
          otherRole: typeof raw.otherRole === "string" ? raw.otherRole.trim() : "",
          revenueRange: typeof raw.revenueRange === "string" ? raw.revenueRange : "",
          couponCode: typeof raw.couponCode === "string" ? raw.couponCode.trim() : "",
          whatsappConsent: raw.whatsappConsent === true,
        };
        const errors = validate(candidate);
        if (Object.keys(errors).length) {
          const firstField = Object.keys(errors)[0] as ApplicationField;
          trackValidationError(firstField, errors[firstField] || VALIDATION_SUMMARY);
          throw new Error(errors[firstField]);
        }
        submittingRef.current = true;
        await activeSaveRef.current?.catch(() => undefined);
        let result: SubmissionResult;
        try {
          result = await submitApplication(candidate, leadId());
        } catch (error) {
          submittingRef.current = false;
          throw error;
        }
        latestDataRef.current = candidate;
        setData(candidate);
        storeDraft(leadId(), candidate);
        finishSubmission(candidate, result);
        return { id: result.id, status: result.access === "free" ? "completed" : "payment_pending", checkoutUrl: result.checkoutUrl };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, [finishSubmission, leadId, trackValidationError]);

  const update = (field: keyof ApplicationData, value: string | boolean) => {
    const current = latestDataRef.current;
    const next = field === "role"
      ? { ...current, role: String(value), otherRole: value === "other" ? current.otherRole : "" }
      : { ...current, [field]: value };
    latestDataRef.current = next;
    setData(next);
    setRequestError('');
    if (draftReady) storeDraft(leadId(), next);
    setErrors((current) => {
      if (!current[field] && (field !== "role" || !current.otherRole)) return current;
      const next = { ...current };
      delete next[field];
      if (field === "role") delete next.otherRole;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setRequestError("");
    const snapshot = latestDataRef.current;
    const nextErrors = validate(snapshot);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      setRequestError(VALIDATION_SUMMARY);
      trackValidationError(firstField, nextErrors[firstField as ApplicationField] || VALIDATION_SUMMARY);
      focusApplicationField(firstField);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      await activeSaveRef.current?.catch(() => undefined);
      const result = await submitApplication(snapshot, leadId());
      finishSubmission(snapshot, result);
    } catch (error) {
      submittingRef.current = false;
      if (error instanceof ApplicationValidationError) {
        setErrors(error.fields);
        focusApplicationField(Object.keys(error.fields)[0]);
      }
      const message = error instanceof Error ? error.message : "Não foi possível registrar sua inscrição. Tente novamente.";
      trackValidationError("submission", message, "server");
      setRequestError(message);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return <RegistrationSuccess name={data.name} receiptId={receiptId} processing={processing} onRestart={startAnotherRegistration} />;
  }

  if (paymentUrl) {
    return (
      <div className="rounded-[1.6rem] border border-white/60 bg-white px-6 py-12 text-center shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:px-12 sm:py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#EDF3F1] text-[#1F7558]">
          {paymentUrl ? <ArrowRight className="size-8" /> : <Check className="size-8" strokeWidth={2.4} />}
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#C69858]">{paymentUrl ? "Próximo passo" : "Inscrição gratuita recebida"}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#002647]">{paymentUrl ? "Continue para o pagamento" : `Obrigado, ${data.name.split(" ")[0]}.`}</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#60778A]">
          {paymentUrl ? "Sua inscrição foi registrada. Conclua o pagamento de R$ 2.497,00 para garantir o acesso." : "Seu cupom foi aplicado. A equipe X5Med vai analisar suas respostas e entrar em contato sobre os próximos passos."}
        </p>
        {receiptId && <p className="mx-auto mt-3 max-w-md break-all text-xs leading-5 text-[#60778A]">Protocolo: {receiptId}{processing && processing !== 'applied' ? ' · Respostas recebidas; cadastro em conferência pela equipe.' : ''}</p>}
        {paymentUrl
          ? <a href={paymentUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#002647] px-6 font-semibold text-white">Ir para pagamento <ArrowRight className="size-4" /></a>
          : <Button type="button" onClick={startAnotherRegistration} className="mt-7 h-12 rounded-xl bg-[#002647] px-6 text-white hover:bg-[#06395F]">Cadastrar outra pessoa</Button>}
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C69858]">Inscrição EscalaMED 2026</p>
        <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[#002647] sm:text-3xl">Garanta sua inscrição</h2>
        <p className="mt-2 text-sm leading-6 text-[#60778A]">Análise do seu perfil e retorno de um consultor pelo WhatsApp.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#E7D2AE] bg-[#FBF6ED] px-5 py-4 text-[#002647]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#987044]"><Ticket className="size-4" /> Investimento</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-3xl font-extrabold tracking-[-0.06em] sm:text-4xl">R$ 2.497,00</strong>
        </div>
      </div>

      <form
        className="registration-form"
        onSubmit={handleSubmit}
        onFocusCapture={trackFormStart}
        onBlur={(event) => {
          const field = event.target.id as ApplicationField;
          if (APPLICATION_FIELDS.includes(field)) {
            const message = validate(latestDataRef.current)[field];
            setErrors(current => { const next = {...current}; if (message) next[field] = message; else delete next[field]; return next; });
          }
          void savePartial(latestDataRef.current).catch(() => undefined);
        }}
        noValidate
      >
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={data.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} />

        <div className="grid gap-x-4 gap-y-4 xl:grid-cols-2">
          <div><Label htmlFor="name" className="mb-2 text-[#173D5D]">Nome completo *</Label><Input id="name" autoComplete="name" required className="form-field" placeholder="Seu nome completo" value={data.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} /><FieldError field="name">{errors.name}</FieldError></div>
          <div><Label htmlFor="email" className="mb-2 text-[#173D5D]">E-mail *</Label><Input id="email" type="email" autoComplete="email" required className="form-field" placeholder="voce@exemplo.com" value={data.email} onChange={(event) => update("email", event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} /><FieldError field="email">{errors.email}</FieldError></div>
          <div>
            <Label htmlFor="phone" className="mb-2 text-[#173D5D]">WhatsApp *</Label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center border-r border-[#DCE5EC] pr-2.5 text-sm font-medium text-[#526C80]">+55</span>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" required className="form-field pl-[4.1rem]!" placeholder="(11) 99999-9999" value={data.phone} onChange={(event) => update("phone", formatPhoneInput(event.target.value))} aria-invalid={!!errors.phone} aria-describedby={['phone-country', errors.phone && 'phone-error'].filter(Boolean).join(' ')} />
            </div>
            <span id="phone-country" className="sr-only">Código do Brasil +55. Informe o DDD e o número.</span>
            <FieldError field="phone">{errors.phone}</FieldError>
          </div>
          <div><Label htmlFor="instagram" className="mb-2 text-[#173D5D]">Qual o @ do Instagram? *</Label><Input id="instagram" autoCapitalize="none" autoComplete="off" spellCheck={false} required className="form-field" placeholder="@seuperfil" value={data.instagram} onChange={(event) => update("instagram", event.target.value)} aria-invalid={!!errors.instagram} aria-describedby={errors.instagram ? 'instagram-error' : undefined} /><FieldError field="instagram">{errors.instagram}</FieldError></div>
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="role" className="mb-2 text-[#173D5D]">Qual seu cargo na clínica? *</Label><NativeSelect id="role" required className="form-field w-full" value={data.role} onChange={(event) => update("role", event.target.value)} aria-invalid={!!errors.role} aria-describedby={errors.role ? 'role-error' : undefined}><NativeSelectOption value="">Selecione seu cargo</NativeSelectOption><NativeSelectOption value="doctor">Médico</NativeSelectOption><NativeSelectOption value="owner-manager">Dono ou Gestor de clínica</NativeSelectOption><NativeSelectOption value="other">Outros</NativeSelectOption></NativeSelect><FieldError field="role">{errors.role}</FieldError></div>
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="revenueRange" className="mb-2 text-[#173D5D]">Faixa de faturamento por mês *</Label><NativeSelect id="revenueRange" required className="form-field w-full" value={data.revenueRange} onChange={(event) => update("revenueRange", event.target.value)} aria-invalid={!!errors.revenueRange} aria-describedby={errors.revenueRange ? 'revenueRange-error' : undefined}><NativeSelectOption value="">Selecione uma faixa</NativeSelectOption><NativeSelectOption value="under-40k">&lt; 40 mil</NativeSelectOption><NativeSelectOption value="40k-70k">40 a 70 mil</NativeSelectOption><NativeSelectOption value="70k-100k">70 a 100 mil</NativeSelectOption><NativeSelectOption value="over-100k">&gt; 100 mil</NativeSelectOption></NativeSelect><FieldError field="revenueRange">{errors.revenueRange}</FieldError></div>
          {data.role === "other" && <div className="xl:col-span-2"><Label htmlFor="otherRole" className="mb-2 text-[#173D5D]">Caso tenha selecionado Outros, especifique seu cargo *</Label><Input id="otherRole" required className="form-field" placeholder="Seu cargo na clínica" value={data.otherRole} onChange={(event) => update("otherRole", event.target.value)} aria-invalid={!!errors.otherRole} aria-describedby={errors.otherRole ? 'otherRole-error' : undefined} /><FieldError field="otherRole">{errors.otherRole}</FieldError></div>}
          <div className="xl:col-span-2"><Label htmlFor="couponCode" className="mb-2 text-[#173D5D]">Tem um cupom de convite?</Label><Input id="couponCode" autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={80} className="form-field" placeholder="Digite seu cupom (opcional)" value={data.couponCode} onChange={(event) => update("couponCode", formatCouponInput(event.target.value))} onBlur={() => {
            const typedCoupon = latestDataRef.current.couponCode.trim();
            if (!typedCoupon || couponTrackedRef.current === typedCoupon) return;
            couponTrackedRef.current = typedCoupon;
            const validCoupon = normalizeCoupon(typedCoupon);
            pushTrackingEvent("coupon_applied", {
              coupon: validCoupon || typedCoupon,
              coupon_valid: Boolean(validCoupon),
              form_id: FORM_ID,
            });
            if (!validCoupon) trackValidationError("couponCode", "Cupom não reconhecido.");
          }} aria-invalid={!!errors.couponCode || !!(data.couponCode.trim() && !coupon)} aria-describedby={errors.couponCode ? 'couponCode-error' : undefined} /><FieldError field="couponCode">{errors.couponCode}</FieldError>{coupon ? <p className="mt-1.5 text-xs font-semibold text-[#1F7558]">Cupom aplicado: sua inscrição será gratuita.</p> : data.couponCode.trim() && !errors.couponCode ? <p className="mt-1.5 text-xs font-medium text-[#B33D3D]">Cupom não reconhecido. Confira o código ou remova-o para continuar com a inscrição paga.</p> : null}</div>
          <div className="xl:col-span-2">
            <div className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-5 transition-colors ${data.whatsappConsent ? "border-[#B9DED4] bg-[#F1FAF7] text-[#456A61]" : "border-[#E7D2AE] bg-[#FBF6ED] text-[#526C80]"}`}>
              <Switch
                id="whatsappConsent"
                checked={data.whatsappConsent}
                onCheckedChange={(checked) => update("whatsappConsent", checked)}
                aria-required="true"
                aria-invalid={!!errors.whatsappConsent}
                aria-describedby={[!data.whatsappConsent && "whatsapp-consent-help", errors.whatsappConsent && "whatsappConsent-error"].filter(Boolean).join(" ") || undefined}
                className="mt-0.5 !h-7 !w-12 cursor-pointer data-[state=checked]:!bg-[#43CDB5] data-[state=unchecked]:!bg-[#C9D7DD] [&_[data-slot=switch-thumb]]:!size-6 [&_[data-slot=switch-thumb]]:shadow-[0_1px_4px_rgb(0_38_71/24%)]"
              />
              <div className="min-w-0">
                <label htmlFor="whatsappConsent" className="cursor-pointer font-medium">{WHATSAPP_EVENT_REGISTRATION_CONSENT_TEXT}</label>
                {!data.whatsappConsent && <p id="whatsapp-consent-help" className="mt-1 font-semibold text-[#8A6335]">Ative esta opção para concluir sua inscrição.</p>}
                <a className="mt-1 block font-semibold text-[#002647] underline" href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade ↗</a>
              </div>
            </div>
            <FieldError field="whatsappConsent">{errors.whatsappConsent}</FieldError>
            <div className="mt-3 px-1 text-xs leading-5 text-[#60778A]">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input id="meta-ads-consent" type="checkbox" checked={data.metaAdsConsent} onChange={e=>update('metaAdsConsent',e.target.checked)} className="mt-1 size-3.5 shrink-0 accent-[#002647]" />
                <span>{META_CAPI_CONSENT_SUMMARY} <span className="text-[#60778A]">(Opcional)</span></span>
              </label>
              <details className="ml-6 mt-1">
                <summary className="w-fit cursor-pointer rounded-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002647]">Como seus dados são usados</summary>
                <div className="mt-2 space-y-1">
                  <p>{META_CAPI_CONSENT_TEXT}</p>
                  <a className="inline-block font-medium text-[#173D5D] underline" href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade ↗</a>
                </div>
              </details>
            </div>
          </div>
        </div>

        {requestError && <p role="alert" className="mt-5 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A63838]">{requestError}</p>}

        <div className="registration-actions">
          <Button type="submit" className="h-12 w-full rounded-xl bg-[#002647] px-4 text-white shadow-[0_10px_24px_rgb(0_38_71/18%)] hover:bg-[#06395F] disabled:cursor-not-allowed disabled:bg-[#8798A6]" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> Registrando...</> : <>Quero garantir minha vaga <ArrowRight /></>}
          </Button>
          <p className="mt-2 text-center text-xs leading-5 text-[#6F8292]">{coupon ? "Nenhum pagamento será necessário com este cupom." : "Você será direcionado ao pagamento após enviar seus dados."}</p>
        </div>
      </form>
    </div>
  );
}
