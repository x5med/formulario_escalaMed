"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";
import { normalizeCoupon } from "@/lib/coupons";

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

type SubmissionResult = { id: string; access: "free" | "paid"; checkoutUrl?: string };

const initialData: ApplicationData = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  role: "",
  otherRole: "",
  revenueRange: "",
  couponCode: "",
  whatsappConsent: false,
  companyWebsite: "",
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validate(data: ApplicationData) {
  const errors: Record<string, string> = {};
  if (data.name.trim().length < 3) errors.name = "Digite seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errors.email = "Digite um e-mail válido.";
  if (data.phone.replace(/\D/g, "").length < 10) errors.phone = "Digite um WhatsApp com DDD.";
  if (!/^@?[A-Za-z0-9._]{1,30}$/.test(data.instagram.trim())) errors.instagram = "Informe um @ de Instagram válido.";
  if (!["doctor", "owner-manager", "other"].includes(data.role)) errors.role = "Selecione seu cargo na clínica.";
  if (data.role === "other" && data.otherRole.trim().length < 2) errors.otherRole = "Informe seu cargo.";
  if (!["under-40k", "40k-70k", "70k-100k", "over-100k"].includes(data.revenueRange)) errors.revenueRange = "Selecione uma faixa de faturamento.";
  if (data.couponCode.trim() && !normalizeCoupon(data.couponCode)) errors.couponCode = "Cupom não reconhecido. Confira o código ou remova-o para continuar com a inscrição paga.";
  return errors;
}

async function submitApplication(data: ApplicationData): Promise<SubmissionResult> {
  const params = new URLSearchParams(window.location.search);
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      couponCode: data.couponCode.trim(),
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      referrer: document.referrer,
      pageUrl: window.location.href,
    }),
  });
  const result = await response.json() as SubmissionResult & { error?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível registrar sua inscrição. Tente novamente.");
  if (result.access === "paid" && !result.checkoutUrl) throw new Error("O link de pagamento não está disponível. Tente novamente.");
  return result;
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-[#B33D3D]">{children}</p>;
}

export function ApplicationForm() {
  const [data, setData] = useState<ApplicationData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const coupon = normalizeCoupon(data.couponCode);

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
          name: { type: "string", minLength: 3, description: "Nome completo" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 10, description: "WhatsApp com DDD" },
          instagram: { type: "string", minLength: 1, description: "@ do Instagram" },
          role: { type: "string", enum: ["doctor", "owner-manager", "other"] },
          otherRole: { type: "string", description: "Obrigatório para o cargo Outros" },
          revenueRange: { type: "string", enum: ["under-40k", "40k-70k", "70k-100k", "over-100k"] },
          couponCode: { type: "string", description: "Cupom opcional para acesso gratuito" },
          whatsappConsent: { type: "boolean", description: "Aceite opcional de marketing pelo WhatsApp" },
        },
        required: ["name", "email", "phone", "instagram", "role", "revenueRange"],
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
        if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
        const result = await submitApplication(candidate);
        setData(candidate);
        if (result.access === "free") setCompleted(true);
        else {
          setPaymentUrl(result.checkoutUrl!);
          window.location.assign(result.checkoutUrl!);
        }
        return { id: result.id, status: result.access === "free" ? "completed" : "payment_pending", checkoutUrl: result.checkoutUrl };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const update = (field: keyof ApplicationData, value: string | boolean) => {
    setData((current) => field === "role"
      ? { ...current, role: String(value), otherRole: value === "other" ? current.otherRole : "" }
      : { ...current, [field]: value });
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
    setRequestError("");
    const nextErrors = validate(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await submitApplication(data);
      if (result.access === "free") setCompleted(true);
      else {
        setPaymentUrl(result.checkoutUrl!);
        window.location.assign(result.checkoutUrl!);
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Não foi possível registrar sua inscrição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (completed || paymentUrl) {
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
        {paymentUrl && <a href={paymentUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#002647] px-6 font-semibold text-white">Ir para pagamento <ArrowRight className="size-4" /></a>}
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C69858]">Inscrição EscalaMED 2026</p>
        <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[#002647] sm:text-3xl">Garanta sua inscrição</h2>
        <p className="mt-2 text-sm leading-6 text-[#60778A]">Preencha seus dados para participar. Você pode usar um cupom de convite para ter acesso gratuito.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#E7D2AE] bg-[#FBF6ED] px-5 py-4 text-[#002647]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#987044]"><Ticket className="size-4" /> Investimento</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-3xl font-extrabold tracking-[-0.06em] sm:text-4xl">R$ 2.497,00</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={data.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} />

        <div className="grid gap-x-4 gap-y-4 xl:grid-cols-2">
          <div><Label htmlFor="name" className="mb-2 text-[#173D5D]">Nome completo *</Label><Input id="name" autoComplete="name" required className="form-field" placeholder="Seu nome completo" value={data.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name} /><FieldError>{errors.name}</FieldError></div>
          <div><Label htmlFor="email" className="mb-2 text-[#173D5D]">E-mail *</Label><Input id="email" type="email" autoComplete="email" required className="form-field" placeholder="voce@exemplo.com" value={data.email} onChange={(event) => update("email", event.target.value)} aria-invalid={!!errors.email} /><FieldError>{errors.email}</FieldError></div>
          <div><Label htmlFor="phone" className="mb-2 text-[#173D5D]">WhatsApp *</Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" required className="form-field" placeholder="(11) 99999-9999" value={data.phone} onChange={(event) => update("phone", formatPhone(event.target.value))} aria-invalid={!!errors.phone} /><FieldError>{errors.phone}</FieldError></div>
          <div><Label htmlFor="instagram" className="mb-2 text-[#173D5D]">Qual o @ do Instagram? *</Label><Input id="instagram" autoCapitalize="none" autoComplete="off" spellCheck={false} required className="form-field" placeholder="@seuperfil" value={data.instagram} onChange={(event) => update("instagram", event.target.value)} aria-invalid={!!errors.instagram} /><FieldError>{errors.instagram}</FieldError></div>
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="role" className="mb-2 text-[#173D5D]">Qual seu cargo na clínica? *</Label><NativeSelect id="role" required className="form-field w-full" value={data.role} onChange={(event) => update("role", event.target.value)} aria-invalid={!!errors.role}><NativeSelectOption value="">Selecione seu cargo</NativeSelectOption><NativeSelectOption value="doctor">Médico</NativeSelectOption><NativeSelectOption value="owner-manager">Dono ou Gestor de clínica</NativeSelectOption><NativeSelectOption value="other">Outros</NativeSelectOption></NativeSelect><FieldError>{errors.role}</FieldError></div>
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="revenueRange" className="mb-2 text-[#173D5D]">Faixa de faturamento por mês *</Label><NativeSelect id="revenueRange" required className="form-field w-full" value={data.revenueRange} onChange={(event) => update("revenueRange", event.target.value)} aria-invalid={!!errors.revenueRange}><NativeSelectOption value="">Selecione uma faixa</NativeSelectOption><NativeSelectOption value="under-40k">&lt; 40 mil</NativeSelectOption><NativeSelectOption value="40k-70k">40 a 70 mil</NativeSelectOption><NativeSelectOption value="70k-100k">70 a 100 mil</NativeSelectOption><NativeSelectOption value="over-100k">&gt; 100 mil</NativeSelectOption></NativeSelect><FieldError>{errors.revenueRange}</FieldError></div>
          {data.role === "other" && <div className="xl:col-span-2"><Label htmlFor="otherRole" className="mb-2 text-[#173D5D]">Caso tenha selecionado Outros, especifique seu cargo *</Label><Input id="otherRole" required className="form-field" placeholder="Seu cargo na clínica" value={data.otherRole} onChange={(event) => update("otherRole", event.target.value)} aria-invalid={!!errors.otherRole} /><FieldError>{errors.otherRole}</FieldError></div>}
          <div className="xl:col-span-2"><Label htmlFor="couponCode" className="mb-2 text-[#173D5D]">Tem um cupom de convite?</Label><Input id="couponCode" autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={80} className="form-field" placeholder="Digite seu cupom (opcional)" value={data.couponCode} onChange={(event) => update("couponCode", event.target.value)} aria-invalid={!!errors.couponCode || !!(data.couponCode.trim() && !coupon)} /><FieldError>{errors.couponCode}</FieldError>{coupon ? <p className="mt-1.5 text-xs font-semibold text-[#1F7558]">Cupom aplicado: sua inscrição será gratuita.</p> : data.couponCode.trim() && !errors.couponCode ? <p className="mt-1.5 text-xs font-medium text-[#B33D3D]">Cupom não reconhecido. Confira o código ou remova-o para continuar com a inscrição paga.</p> : null}</div>
          <div className="xl:col-span-2 flex items-start gap-3 rounded-xl border border-[#DCE5EC] bg-[#F7FAFD] p-3.5 text-xs leading-5 text-[#526C80]"><input id="whatsapp-consent" type="checkbox" className="mt-1 size-4 shrink-0 accent-[#002647]" checked={data.whatsappConsent} onChange={(event) => update("whatsappConsent", event.target.checked)} /><div><label htmlFor="whatsapp-consent" className="cursor-pointer">{WHATSAPP_MARKETING_CONSENT_TEXT}</label><a className="mt-1 block font-semibold text-[#002647] underline" href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade ↗</a></div></div>
        </div>

        {requestError && <p role="alert" className="mt-5 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A63838]">{requestError}</p>}

        <Button type="submit" className="mt-6 h-12 w-full rounded-xl bg-[#002647] px-6 text-white shadow-[0_10px_24px_rgb(0_38_71/18%)] hover:bg-[#06395F]" disabled={loading}>
          {loading ? <><Loader2 className="animate-spin" /> Registrando...</> : coupon ? <>Concluir inscrição gratuita <Check /></> : <>Continuar para pagamento <ArrowRight /></>}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-[#6F8292]">{coupon ? "Nenhum pagamento será necessário com este cupom." : "Você será direcionado ao pagamento após enviar seus dados."}</p>
      </form>
    </div>
  );
}
