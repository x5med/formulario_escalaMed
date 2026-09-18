import Image from "next/image";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { ApplicationForm } from "@/components/application-form";

export default function Home() {
  return (
    <main className="brand-shell min-h-screen overflow-x-clip bg-[#082943] text-white">
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[minmax(0,0.9fr)_minmax(540px,0.95fr)]">
        <section className="hero-panel relative isolate flex min-h-[360px] flex-col justify-between px-5 pb-7 pt-6 sm:min-h-[420px] sm:px-9 sm:pt-8 lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:px-10 lg:py-8 xl:px-16">
          <div>
            <Image src="/escalamed-logo-dark.png" alt="EscalaMed" width={675} height={120} priority className="h-auto w-[190px] sm:w-[225px]" />

            <div className="mt-8 hidden lg:block">
              <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#C69858]">
                <span className="h-px w-12 bg-[#C69858]" />
                Candidatura 2026
              </div>
              <h1 className="max-w-[23rem] text-balance text-[clamp(2.5rem,3.5vw,3.65rem)] font-extrabold uppercase leading-[0.98] tracking-[0.005em] text-white">
                Sua clínica está pronta para o próximo nível?
              </h1>
              <p className="mt-5 max-w-[23rem] text-base leading-7 text-white/85">
                Conte sobre o seu momento atual. A equipe X5Med vai analisar o seu perfil e entrar em contato com os próximos passos.
              </p>
            </div>
          </div>

          <div className="lg:hidden">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#D8AC6E]">Candidatura 2026</p>
            <h1 className="max-w-[19rem] text-balance text-[2.1rem] font-extrabold uppercase leading-[1.02] tracking-[0.005em] text-white sm:max-w-md sm:text-[2.75rem]">
              Sua clínica está pronta para o próximo nível?
            </h1>
          </div>

          <div className="mt-6 hidden border-t border-white/15 pt-5 lg:block">
            <div className="grid max-w-lg grid-cols-2 gap-5 text-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 text-[#C69858]" />
                <div><p className="font-semibold text-white">27 a 29 de novembro</p><p className="mt-1 text-white/55">Imersão presencial · 2026</p></div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-[#C69858]" />
                <div><p className="font-semibold text-white">Alphaville</p><p className="mt-1 text-white/55">São Paulo</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center bg-[#EFF5FA] px-4 pb-5 pt-6 sm:px-8 sm:pb-8 lg:bg-[linear-gradient(135deg,#E9F3FA_0%,#F7FAFD_60%,#E9F1F7_100%)] lg:px-12 lg:py-6 xl:px-16">
          <div className="mx-auto w-full max-w-[650px]">
            <ApplicationForm />

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#486176]">
              <ShieldCheck className="size-4 shrink-0 text-[#C69858]" />
              Seus dados são tratados com segurança e usados apenas pelo EscalaMED.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
