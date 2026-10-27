"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight, BadgeCheck, CalendarDays, ListChecks, MapPin, MessageCircle, Ticket, UserPlus } from "lucide-react";

const teamUrl = 'https://wa.me/5579998287305?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20sobre%20minha%20inscri%C3%A7%C3%A3o%20no%20EscalaMED.';
const steps = [
  { icon: MessageCircle, title: 'Acompanhe seu WhatsApp', description: 'Nossa equipe vai analisar seu perfil e entrar em contato pelo WhatsApp informado. O time de Sucesso do Cliente compartilhará as informações e orientações para sua participação.' },
  { icon: CalendarDays, title: 'Reserve 27, 28 e 29 de novembro', description: 'Separe os três dias de 2026 na sua agenda para viver a imersão presencial. Se seus planos mudarem, avise nossa equipe.' },
  { icon: MapPin, title: 'Prepare sua chegada a Alphaville', description: 'O encontro será no Star Eventos Alphaville: Alameda Madeira, 222, Edifício Alfacon, salas 21 e 22, Alphaville — Barueri, SP.' },
];

export function RegistrationSuccess({ name, receiptId, processing, onRestart }: { name: string; receiptId: string; processing: string; onRestart: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="registration-success">
      <header className="success-header">
        <a href="#registration-success-title" aria-label="EscalaMed — início da página" className="success-brand">
          <Image src="/escalamed-logo-dark.png" alt="EscalaMed" width={675} height={120} className="h-auto w-[175px] sm:w-[195px]" />
          <span className="hidden border-l border-white/20 pl-5 text-xs leading-5 text-white/70 sm:block">Imersão presencial<br /><strong className="text-white">A Rota do Crescimento</strong></span>
        </a>
        <nav aria-label="Navegação da confirmação" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold">
          <a href="#success-next-steps" className="inline-flex items-center gap-2 text-white/75"><ListChecks className="size-4" />Próximos passos</a>
          <a href={teamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#D3A45E]"><MessageCircle className="size-4" />Falar com a equipe<ArrowUpRight className="size-3.5" /></a>
        </nav>
      </header>

      <section className="success-hero" aria-labelledby="registration-success-title">
        <div aria-hidden="true" className="success-ribbon success-ribbon-one">Seu próximo passo começa aqui · Estratégia. Gestão. Crescimento.</div>
        <div aria-hidden="true" className="success-ribbon success-ribbon-two">EscalaMED · A Rota do Crescimento · Seu próximo passo começa aqui.</div>
        <div className="success-ticket">
          <div className="success-ticket-body">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <span className="inline-flex items-center text-[1.65rem] font-semibold tracking-[-0.06em] sm:text-[2.1rem]">EscalaMed<ArrowUpRight aria-hidden="true" className="size-8 text-[#C69858]" strokeWidth={3} /></span>
              <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold text-[#436178] sm:text-xs"><BadgeCheck className="size-4" />Inscrição recebida</span>
            </div>
            <p className="mt-8 text-xs font-semibold sm:mt-10 sm:text-sm">A Rota do Crescimento</p>
            <h1 ref={heading} id="registration-success-title" tabIndex={-1} className="mt-3 text-[clamp(2rem,4.3vw,3.8rem)] font-extrabold uppercase leading-[1.04] tracking-[-0.055em] outline-none">Obrigado pela<br className="hidden sm:block" /> sua inscrição.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#436178] sm:text-base">{name.split(' ')[0]}, seu cupom foi aplicado e recebemos suas respostas. A equipe X5Med vai entrar em contato pelo WhatsApp com os próximos passos.</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#436178]">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />27 a 29 de novembro de 2026</span>
              <span className="inline-flex items-center gap-2"><MapPin className="size-4" />Alphaville, São Paulo</span>
            </div>
            <a href="#success-next-steps" className="mt-7 inline-flex min-h-12 items-center justify-center gap-6 rounded-lg bg-[#C69858] px-5 text-sm font-semibold text-[#002647] hover:bg-[#D3A45E]">Ver próximos passos<ArrowDown className="size-4" /></a>
          </div>
          <div aria-hidden="true" className="success-ticket-stub">
            <span className="success-ticket-year">2026</span>
            <Ticket className="relative size-7" />
            <span className="success-ticket-label">INGRESSO</span>
            <span className="relative flex size-16 items-center justify-center rounded-full border-2 border-white/70 text-sm font-extrabold">X5 MED</span>
          </div>
        </div>
      </section>

      <section id="success-next-steps" className="success-next-steps scroll-mt-6" aria-labelledby="success-next-steps-title">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D3A45E]">Sua próxima etapa</p>
        <h2 id="success-next-steps-title" className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Seus próximos passos</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Agora que seu formulário foi recebido, veja como se preparar para o EscalaMED.</p>
        <ol className="mt-7 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="rounded-2xl border border-white/15 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between"><Icon className="size-6 text-[#D3A45E]" /><span className="text-xs font-semibold text-white/40">0{index + 1}</span></div>
              <h3 className="mt-5 text-base font-semibold leading-6 text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">{description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <a href={teamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C69858] px-5 text-sm font-semibold text-[#002647] hover:bg-[#D3A45E]"><MessageCircle className="size-4" />Falar com a equipe</a>
          <button type="button" onClick={onRestart} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"><UserPlus className="size-4" />Cadastrar outra pessoa</button>
        </div>
        {receiptId && <p className="mt-7 break-words text-xs leading-6 text-white/50">Protocolo: {receiptId}{processing && processing !== 'applied' ? ' · Respostas recebidas; cadastro em conferência pela equipe.' : ''}</p>}
      </section>
    </div>
  );
}
