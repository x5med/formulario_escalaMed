"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type FormData = {
  name: string;
  email: string;
  phone: string;
  crm: string;
  specialty: string;
  city: string;
  clinic: string;
  revenueRange: string;
  teamSize: string;
  mainDifficulty: string;
  objective: string;
  bottleneck: string;
  consent: boolean;
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
  crm: "",
  specialty: "",
  city: "",
  clinic: "",
  revenueRange: "",
  teamSize: "",
  mainDifficulty: "",
  objective: "",
  bottleneck: "",
  consent: false,
  companyWebsite: "",
};

const stepMeta = [
  { label: "Seus dados", title: "Vamos começar por você", description: "Leva menos de um minuto. Ao avançar, sua candidatura já fica registrada." },
  { label: "Perfil", title: "Seu perfil profissional", description: "Essas informações ajudam a equipe a entender a sua atuação." },
  { label: "Clínica", title: "O momento da sua clínica", description: "Compartilhe uma visão geral da operação atual." },
  { label: "Objetivos", title: "Onde você quer chegar?", description: "Última etapa: conte o que precisa mudar no seu negócio." },
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
  const [leadId, setLeadId] = useState<string | null>(null);
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const stringFields = ["name", "email", "phone", "crm", "specialty", "city", "clinic", "revenueRange", "teamSize", "mainDifficulty", "objective", "bottleneck"] as const;
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
          crm: { type: "string", minLength: 3, description: "CRM e estado" },
          specialty: { type: "string", minLength: 2 },
          city: { type: "string", minLength: 2, description: "Cidade e estado" },
          clinic: { type: "string", minLength: 2 },
          revenueRange: { type: "string", enum: ["ate-50k", "50k-100k", "100k-300k", "300k-500k", "acima-500k"] },
          teamSize: { type: "string", enum: ["so-eu", "2-5", "6-10", "11-20", "21-plus"] },
          mainDifficulty: { type: "string", minLength: 10 },
          objective: { type: "string", minLength: 10 },
          bottleneck: { type: "string", minLength: 10 },
          consent: { type: "boolean", const: true, description: "Autorização para contato sobre a candidatura" },
        },
        required: [...stringFields, "consent"],
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
        if (!/^\S+@\S+\.\S+$/.test(candidate.email) || candidate.phone.replace(/\D/g, "").length < 10 || raw.consent !== true) {
          throw new Error("E-mail, WhatsApp ou consentimento inválido.");
        }
        candidate.consent = true;
        const tracking = {
          utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
          referrer: document.referrer,
        };
        const started = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...candidate, ...tracking, currentStep: 2, status: "started" }) });
        if (!started.ok) throw new Error("Não foi possível iniciar a candidatura.");
        const { id } = (await started.json()) as { id: string };
        const finished = await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...candidate, id, currentStep: 4, status: "completed" }) });
        if (!finished.ok) throw new Error("Não foi possível concluir a candidatura.");
        setData(candidate);
        setLeadId(id);
        setStep(4);
        setCompleted(true);
        return { id, status: "completed" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const update = (field: keyof FormData, value: string | boolean) => {
    setData((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (step === 1) {
      if (data.name.trim().length < 3) next.name = "Digite seu nome completo.";
      if (!/^\S+@\S+\.\S+$/.test(data.email)) next.email = "Digite um e-mail válido.";
      if (data.phone.replace(/\D/g, "").length < 10) next.phone = "Digite um WhatsApp com DDD.";
    }
    if (step === 2) {
      if (data.crm.trim().length < 3) next.crm = "Informe seu CRM e estado.";
      if (data.specialty.trim().length < 2) next.specialty = "Informe sua especialidade.";
      if (data.city.trim().length < 2) next.city = "Informe sua cidade e estado.";
      if (data.clinic.trim().length < 2) next.clinic = "Informe o nome da clínica ou consultório.";
    }
    if (step === 3) {
      if (!data.revenueRange) next.revenueRange = "Selecione uma faixa de faturamento.";
      if (!data.teamSize) next.teamSize = "Selecione o tamanho da equipe.";
      if (data.mainDifficulty.trim().length < 10) next.mainDifficulty = "Conte um pouco mais sobre o desafio atual.";
    }
    if (step === 4) {
      if (data.objective.trim().length < 10) next.objective = "Descreva seu principal objetivo.";
      if (data.bottleneck.trim().length < 10) next.bottleneck = "Descreva o que mais limita seu crescimento.";
      if (!data.consent) next.consent = "Confirme para enviar a candidatura.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = async (nextStep: number, final = false) => {
    const tracking = typeof window === "undefined" ? {} : {
      utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
      utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
      utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
      referrer: document.referrer,
    };
    const response = await fetch("/api/leads", {
      method: leadId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        ...tracking,
        id: leadId,
        currentStep: nextStep,
        status: final ? "completed" : "started",
      }),
    });
    if (!response.ok) throw new Error("Não foi possível salvar agora.");
    const result = (await response.json()) as { id: string };
    if (!leadId) setLeadId(result.id);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRequestError("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (step < 4) {
        await persist(step + 1);
        setStep((current) => current + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        await persist(4, true);
        setCompleted(true);
      }
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
          A equipe EscalaMED vai analisar suas respostas e entrar em contato pelo WhatsApp ou e-mail informado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-[0_30px_80px_rgb(0_24_44/18%)] sm:p-8 lg:p-9">
      <div className="mb-7">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C69858]">Etapa {step} de 4</p>
          <p className="text-xs font-medium text-[#6F8292]">{stepMeta[step - 1].label}</p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2" aria-label={`Progresso: etapa ${step} de 4`}>
          {[1, 2, 3, 4].map((item) => <span key={item} className={`h-1.5 rounded-full transition-colors ${item <= step ? "bg-[#C69858]" : "bg-[#E4EBF0]"}`} />)}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[#002647] sm:text-3xl">{stepMeta[step - 1].title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#60778A]">{stepMeta[step - 1].description}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={data.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} />

        {step === 1 && <div className="grid gap-5">
          <div><Label htmlFor="name" className="mb-2 text-[#173D5D]">Nome completo</Label><Input id="name" autoComplete="name" autoFocus className="form-field" placeholder="Como podemos chamar você?" value={data.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name} /><FieldError>{errors.name}</FieldError></div>
          <div><Label htmlFor="email" className="mb-2 text-[#173D5D]">E-mail</Label><Input id="email" type="email" autoComplete="email" className="form-field" placeholder="voce@exemplo.com" value={data.email} onChange={(event) => update("email", event.target.value)} aria-invalid={!!errors.email} /><FieldError>{errors.email}</FieldError></div>
          <div><Label htmlFor="phone" className="mb-2 text-[#173D5D]">WhatsApp</Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="form-field" placeholder="(11) 99999-9999" value={data.phone} onChange={(event) => update("phone", formatPhone(event.target.value))} aria-invalid={!!errors.phone} /><FieldError>{errors.phone}</FieldError></div>
        </div>}

        {step === 2 && <div className="grid gap-5 sm:grid-cols-2">
          <div><Label htmlFor="crm" className="mb-2 text-[#173D5D]">CRM + estado</Label><Input id="crm" autoFocus className="form-field" placeholder="Ex.: 123456 / SP" value={data.crm} onChange={(event) => update("crm", event.target.value)} aria-invalid={!!errors.crm} /><FieldError>{errors.crm}</FieldError></div>
          <div><Label htmlFor="specialty" className="mb-2 text-[#173D5D]">Especialidade</Label><Input id="specialty" className="form-field" placeholder="Ex.: Dermatologia" value={data.specialty} onChange={(event) => update("specialty", event.target.value)} aria-invalid={!!errors.specialty} /><FieldError>{errors.specialty}</FieldError></div>
          <div><Label htmlFor="city" className="mb-2 text-[#173D5D]">Cidade / UF</Label><Input id="city" autoComplete="address-level2" className="form-field" placeholder="Ex.: Campinas / SP" value={data.city} onChange={(event) => update("city", event.target.value)} aria-invalid={!!errors.city} /><FieldError>{errors.city}</FieldError></div>
          <div><Label htmlFor="clinic" className="mb-2 text-[#173D5D]">Clínica ou consultório</Label><Input id="clinic" className="form-field" placeholder="Nome do negócio" value={data.clinic} onChange={(event) => update("clinic", event.target.value)} aria-invalid={!!errors.clinic} /><FieldError>{errors.clinic}</FieldError></div>
        </div>}

        {step === 3 && <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="revenue" className="mb-2 text-[#173D5D]">Faturamento mensal</Label><NativeSelect id="revenue" autoFocus className="form-field w-full" value={data.revenueRange} onChange={(event) => update("revenueRange", event.target.value)} aria-invalid={!!errors.revenueRange}><NativeSelectOption value="">Selecione uma faixa</NativeSelectOption><NativeSelectOption value="ate-50k">Até R$ 50 mil</NativeSelectOption><NativeSelectOption value="50k-100k">R$ 50 mil a R$ 100 mil</NativeSelectOption><NativeSelectOption value="100k-300k">R$ 100 mil a R$ 300 mil</NativeSelectOption><NativeSelectOption value="300k-500k">R$ 300 mil a R$ 500 mil</NativeSelectOption><NativeSelectOption value="acima-500k">Acima de R$ 500 mil</NativeSelectOption></NativeSelect><FieldError>{errors.revenueRange}</FieldError></div>
            <div className="[&_[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="team" className="mb-2 text-[#173D5D]">Tamanho da equipe</Label><NativeSelect id="team" className="form-field w-full" value={data.teamSize} onChange={(event) => update("teamSize", event.target.value)} aria-invalid={!!errors.teamSize}><NativeSelectOption value="">Selecione</NativeSelectOption><NativeSelectOption value="so-eu">Só eu</NativeSelectOption><NativeSelectOption value="2-5">2 a 5 pessoas</NativeSelectOption><NativeSelectOption value="6-10">6 a 10 pessoas</NativeSelectOption><NativeSelectOption value="11-20">11 a 20 pessoas</NativeSelectOption><NativeSelectOption value="21-plus">21 pessoas ou mais</NativeSelectOption></NativeSelect><FieldError>{errors.teamSize}</FieldError></div>
          </div>
          <div><Label htmlFor="difficulty" className="mb-2 text-[#173D5D]">Qual é o principal desafio hoje?</Label><Textarea id="difficulty" className="min-h-28 resize-none rounded-xl border-[#CDDBE5] bg-white px-4 py-3 text-[#002647] focus-visible:border-[#C69858] focus-visible:ring-[#C69858]/20" placeholder="Ex.: atrair pacientes, organizar processos, liderar equipe..." value={data.mainDifficulty} onChange={(event) => update("mainDifficulty", event.target.value)} aria-invalid={!!errors.mainDifficulty} /><FieldError>{errors.mainDifficulty}</FieldError></div>
        </div>}

        {step === 4 && <div className="grid gap-5">
          <div><Label htmlFor="objective" className="mb-2 text-[#173D5D]">Qual é o seu principal objetivo para os próximos 12 meses?</Label><Textarea id="objective" autoFocus className="min-h-24 resize-none rounded-xl border-[#CDDBE5] bg-white px-4 py-3 text-[#002647] focus-visible:border-[#C69858] focus-visible:ring-[#C69858]/20" placeholder="Conte onde você quer chegar..." value={data.objective} onChange={(event) => update("objective", event.target.value)} aria-invalid={!!errors.objective} /><FieldError>{errors.objective}</FieldError></div>
          <div><Label htmlFor="bottleneck" className="mb-2 text-[#173D5D]">O que mais limita esse crescimento?</Label><Textarea id="bottleneck" className="min-h-24 resize-none rounded-xl border-[#CDDBE5] bg-white px-4 py-3 text-[#002647] focus-visible:border-[#C69858] focus-visible:ring-[#C69858]/20" placeholder="Ex.: tempo, gestão, equipe, comercial..." value={data.bottleneck} onChange={(event) => update("bottleneck", event.target.value)} aria-invalid={!!errors.bottleneck} /><FieldError>{errors.bottleneck}</FieldError></div>
          <div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DCE5EC] bg-[#F7FAFD] p-3.5 text-xs leading-5 text-[#526C80]"><input type="checkbox" className="mt-1 size-4 accent-[#002647]" checked={data.consent} onChange={(event) => update("consent", event.target.checked)} /><span>Autorizo o contato da equipe EscalaMED sobre esta candidatura e conteúdos relacionados ao evento.</span></label><FieldError>{errors.consent}</FieldError></div>
        </div>}

        {requestError && <p role="alert" className="mt-5 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A63838]">{requestError}</p>}

        <div className={`mt-7 flex items-center gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
          {step > 1 && <Button type="button" variant="ghost" className="h-12 rounded-xl px-3 text-[#526C80] hover:bg-[#EDF3F7] hover:text-[#002647]" onClick={() => setStep((current) => current - 1)} disabled={loading}><ArrowLeft /> Voltar</Button>}
          <Button type="submit" className="h-12 min-w-[170px] rounded-xl bg-[#002647] px-6 text-white shadow-[0_10px_24px_rgb(0_38_71/18%)] hover:bg-[#06395F]" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Salvando...</> : step === 4 ? <>Enviar candidatura <Check /></> : <>Continuar <ArrowRight /></>}</Button>
        </div>
      </form>
    </div>
  );
}
