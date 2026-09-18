"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { WHATSAPP_MARKETING_CONSENT_TEXT } from "@/lib/consent";

type FormData = {
  name: string;
  email: string;
  phone: string;
  instagram: string;
  role: string;
  otherRole: string;
  revenueRange: string;
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

const initialData: FormData = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  role: "",
  otherRole: "",
  revenueRange: "",
  whatsappConsent: false,
  companyWebsite: "",
};

const stepMeta = [
  { label: "Seus dados", title: "Vamos começar por você", description: "Leva menos de um minuto. Ao avançar, começamos a registrar sua candidatura." },
  { label: "Sua clínica", title: "Conte sobre sua atuação", description: "Falta pouco para concluir sua candidatura." },
];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-[#B33D3D]">{children}</p>;
}

export function ApplicationForm() {
  const [step, setStep] = useState(1);
  const leadIdRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<Promise<void> | null>(null);
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const stringFields = ["name", "email", "phone", "role", "revenueRange"] as const;
    void Promise.resolve(context.registerTool({
      name: "submit_escalamed_application",
      title: "Enviar candidatura EscalaMED",
      description: "Envia uma candidatura completa ao EscalaMED e mostra a confirmação na página.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 3, description: "Nome completo" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 10, description: "WhatsApp com DDD" },
          instagram: { type: "string", minLength: 1, description: "@ do Instagram" },
          role: { type: "string", enum: ["doctor", "owner-manager", "other"], description: "Cargo na clínica" },
          otherRole: { type: "string", description: "Cargo, obrigatório quando role for other" },
          revenueRange: { type: "string", enum: ["under-40k", "40k-70k", "70k-100k", "over-100k"] },
          whatsappConsent: { type: "boolean", description: "Aceite opcional de marketing pelo WhatsApp" },
        },
        required: [...stringFields, "instagram"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== "object") throw new Error("Dados da candidatura inválidos.");
        const raw = input as Record<string, unknown>;
        const candidate = { ...initialData };
        for (const field of stringFields) {
          if (typeof raw[field] !== "string" || raw[field].trim().length < 2) throw new Error(`Campo obrigatório inválido: ${field}.`);
          candidate[field] = raw[field].trim();
        }
        candidate.instagram = typeof raw.instagram === "string" ? raw.instagram.trim() : "";
        candidate.otherRole = candidate.role === "other" && typeof raw.otherRole === "string" ? raw.otherRole.trim() : "";
        if (!/^@?[A-Za-z0-9._]{1,30}$/.test(candidate.instagram)) throw new Error("Instagram inválido.");
        if (!["doctor", "owner-manager", "other"].includes(candidate.role) || !["under-40k", "40k-70k", "70k-100k", "over-100k"].includes(candidate.revenueRange) || (candidate.role === "other" && candidate.otherRole.length < 2)) {
          throw new Error("Cargo ou faturamento inválido.");
        }
        if (!/^\S+@\S+\.\S+$/.test(candidate.email) || candidate.phone.replace(/\D/g, "").length < 10) {
          throw new Error("E-mail ou WhatsApp inválido.");
        }
        candidate.whatsappConsent = raw.whatsappConsent === true;
        const tracking = {
          utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
          referrer: document.referrer,
        };
        const started = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...candidate, ...tracking, currentStep: 2, status: "started" }) });
        if (!started.ok) throw new Error("Não foi possível iniciar a candidatura.");
        const { id } = (await started.json()) as { id: string };
        const finished = await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...candidate, id, currentStep: 2, status: "completed", pageUrl: window.location.href }) });
        if (!finished.ok) throw new Error("Não foi possível concluir a candidatura.");
        setData(candidate);
        leadIdRef.current = id;
        setStep(2);
        setCompleted(true);
        return { id, status: "completed" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const update = (field: keyof FormData, value: string | boolean) => {
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

  const validate = () => {
    const next: Record<string, string> = {};
    if (step === 1) {
      if (data.name.trim().length < 3) next.name = "Digite seu nome completo.";
      if (!/^\S+@\S+\.\S+$/.test(data.email)) next.email = "Digite um e-mail válido.";
      if (data.phone.replace(/\D/g, "").length < 10) next.phone = "Digite um WhatsApp com DDD.";
      if (!/^@?[A-Za-z0-9._]{1,30}$/.test(data.instagram.trim())) next.instagram = "Informe um @ de Instagram válido.";
    }
    if (step === 2) {
      if (!["doctor", "owner-manager", "other"].includes(data.role)) next.role = "Selecione seu cargo na clínica.";
      if (data.role === "other" && data.otherRole.trim().length < 2) next.otherRole = "Informe seu cargo.";
      if (!["under-40k", "40k-70k", "70k-100k", "over-100k"].includes(data.revenueRange)) next.revenueRange = "Selecione uma faixa de faturamento.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = (nextStep: number, final = false) => {
    const tracking = typeof window === "undefined" ? {} : {
      utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
      utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
      utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
      referrer: document.referrer,
    };
    const payload = { ...data, ...tracking, currentStep: nextStep, status: final ? "completed" : "started", pageUrl: window.location.href };
    const previousSave = pendingSaveRef.current;
    const save = (async () => {
      // A etapa seguinte aguarda a anterior para não chegar ao Metrics antes do lead inicial.
      if (previousSave) await previousSave.catch(() => undefined);

      let id = leadIdRef.current;
      const alreadyCreated = Boolean(id);
      if (!id) {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, currentStep: 2, status: "started" }),
          keepalive: true,
        });
        if (!response.ok) throw new Error("Não foi possível salvar agora.");
        const result = (await response.json()) as { id: string };
        id = result.id;
        leadIdRef.current = id;
      }

      if (nextStep === 2 && !final && !alreadyCreated) return;

      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id }),
      });
      if (!response.ok) throw new Error("Não foi possível salvar agora.");
    })();

    pendingSaveRef.current = save;
    void save.then(
      () => { if (pendingSaveRef.current === save) pendingSaveRef.current = null; },
      () => { if (pendingSaveRef.current === save) pendingSaveRef.current = null; },
    );
    return save;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRequestError("");
    if (!validate()) return;

    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void persist(2).catch(() => {
        setRequestError("Não conseguimos salvar seus dados. Continue preenchendo e tente novamente na próxima etapa.");
      });
      return;
    }

    setLoading(true);
    try {
      await persist(2, true);
      setRequestError("");
      setCompleted(true);
    } catch {
      setRequestError("Não conseguimos salvar suas respostas. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="rounded-[1.6rem] border border-white/60 bg-white px-6 py-12 text-center shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:px-12 sm:py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#EDF3F1] text-[#1F7558]">
          <Check className="size-8" strokeWidth={2.4} />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#C69858]">Candidatura recebida</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#002647]">Obrigado, {data.name.split(" ")[0]}.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#60778A]">
          A equipe X5Med vai analisar suas respostas e entrar em contato pelo WhatsApp ou e-mail informado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:p-8 lg:p-7">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C69858]">Etapa {step} de 2</p>
          <p className="text-xs font-medium text-[#6F8292]">{stepMeta[step - 1].label}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" aria-label={`Progresso: etapa ${step} de 2`}>
          {[1, 2].map((item) => <span key={item} className={`h-1.5 rounded-full transition-colors ${item <= step ? "bg-[#C69858]" : "bg-[#E4EBF0]"}`} />)}
        </div>
      </div>

      <div className="mb-5">
        <h2 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[#002647] sm:text-3xl">{stepMeta[step - 1].title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#60778A]">{stepMeta[step - 1].description}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={data.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} />

        {step === 1 && <div className="grid gap-4">
          <div><Label htmlFor="name" className="mb-2 text-[#173D5D]">Nome completo</Label><Input id="name" autoComplete="name" autoFocus className="form-field" placeholder="Como podemos chamar você?" value={data.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name} /><FieldError>{errors.name}</FieldError></div>
          <div><Label htmlFor="email" className="mb-2 text-[#173D5D]">E-mail</Label><Input id="email" type="email" autoComplete="email" className="form-field" placeholder="voce@exemplo.com" value={data.email} onChange={(event) => update("email", event.target.value)} aria-invalid={!!errors.email} /><FieldError>{errors.email}</FieldError></div>
          <div><Label htmlFor="phone" className="mb-2 text-[#173D5D]">WhatsApp</Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="form-field" placeholder="(11) 99999-9999" value={data.phone} onChange={(event) => update("phone", formatPhone(event.target.value))} aria-invalid={!!errors.phone} /><FieldError>{errors.phone}</FieldError></div>
          <div><Label htmlFor="instagram" className="mb-2 text-[#173D5D]">Qual o @ do Instagram?</Label><Input id="instagram" autoCapitalize="none" autoComplete="off" spellCheck={false} required className="form-field" placeholder="@seuperfil" value={data.instagram} onChange={(event) => update("instagram", event.target.value)} aria-invalid={!!errors.instagram} /><FieldError>{errors.instagram}</FieldError></div>
        </div>}

        {step === 2 && <div className="grid gap-4">
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="role" className="mb-2 text-[#173D5D]">Qual seu cargo na clínica? <span aria-hidden="true" className="text-[#B33D3D]">*</span></Label><NativeSelect id="role" autoFocus required className="form-field w-full" value={data.role} onChange={(event) => update("role", event.target.value)} aria-invalid={!!errors.role}><NativeSelectOption value="">Selecione seu cargo</NativeSelectOption><NativeSelectOption value="doctor">Médico</NativeSelectOption><NativeSelectOption value="owner-manager">Dono ou Gestor de clínica</NativeSelectOption><NativeSelectOption value="other">Outros</NativeSelectOption></NativeSelect><FieldError>{errors.role}</FieldError></div>
          {data.role === "other" && <div><Label htmlFor="otherRole" className="mb-2 text-[#173D5D]">Caso tenha selecionado Outro, especifique qual é o seu cargo: <span aria-hidden="true" className="text-[#B33D3D]">*</span></Label><Input id="otherRole" autoFocus required className="form-field" placeholder="Seu cargo na clínica" value={data.otherRole} onChange={(event) => update("otherRole", event.target.value)} aria-invalid={!!errors.otherRole} /><FieldError>{errors.otherRole}</FieldError></div>}
          <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="revenue" className="mb-2 text-[#173D5D]">Faixa de faturamento por mês <span aria-hidden="true" className="text-[#B33D3D]">*</span></Label><NativeSelect id="revenue" required className="form-field w-full" value={data.revenueRange} onChange={(event) => update("revenueRange", event.target.value)} aria-invalid={!!errors.revenueRange}><NativeSelectOption value="">Selecione uma faixa</NativeSelectOption><NativeSelectOption value="under-40k">&lt; 40 mil</NativeSelectOption><NativeSelectOption value="40k-70k">40 a 70 mil</NativeSelectOption><NativeSelectOption value="70k-100k">70 a 100 mil</NativeSelectOption><NativeSelectOption value="over-100k">&gt; 100 mil</NativeSelectOption></NativeSelect><FieldError>{errors.revenueRange}</FieldError></div>
          <div className="flex items-start gap-3 rounded-xl border border-[#DCE5EC] bg-[#F7FAFD] p-3.5 text-xs leading-5 text-[#526C80]"><input id="whatsapp-consent" type="checkbox" className="mt-1 size-4 shrink-0 accent-[#002647]" checked={data.whatsappConsent} onChange={(event) => update("whatsappConsent", event.target.checked)} /><div><label htmlFor="whatsapp-consent" className="cursor-pointer">{WHATSAPP_MARKETING_CONSENT_TEXT}</label><a className="mt-1 block font-semibold text-[#002647] underline" href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade ↗</a></div></div>
        </div>}

        {requestError && <p role="alert" className="mt-5 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A63838]">{requestError}</p>}

        <div className={`mt-6 flex items-center gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
          {step > 1 && <Button type="button" variant="ghost" className="h-12 rounded-xl px-3 text-[#526C80] hover:bg-[#EDF3F7] hover:text-[#002647]" onClick={() => setStep((current) => current - 1)} disabled={loading}><ArrowLeft /> Voltar</Button>}
          <Button type="submit" className="h-12 min-w-[170px] rounded-xl bg-[#002647] px-6 text-white shadow-[0_10px_24px_rgb(0_38_71/18%)] hover:bg-[#06395F]" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Salvando...</> : step === 2 ? <>Enviar candidatura <Check /></> : <>Continuar <ArrowRight /></>}</Button>
        </div>
      </form>
    </div>
  );
}
