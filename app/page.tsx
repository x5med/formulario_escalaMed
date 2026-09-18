import Image from "next/image";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { ApplicationForm } from "@/components/application-form";

export default function Home() {
  return (
    <main className="brand-shell relative min-h-screen overflow-x-clip bg-[#002647] text-white">
      <div aria-hidden="true" className="brand-grid absolute inset-0 opacity-35" />
      <div aria-hidden="true" className="gold-glow absolute -right-32 top-0 h-96 w-96 rounded-full" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[minmax(0,0.9fr)_minmax(540px,0.95fr)]">
        <section className="flex flex-col px-5 pb-8 pt-6 sm:px-9 sm:pt-8 lg:sticky lg:top-0 lg:h-screen lg:justify-between lg:px-10 lg:py-8 xl:px-16">
          <div>
            <Image src="/escalamed-logo-dark.png" alt="EscalaMed" width={675} height={120} priority className="h-auto w-[190px] sm:w-[225px]" />

            <div className="mt-8 hidden lg:block">
              <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#C69858]">
                <span className="h-px w-12 bg-[#C69858]" />
                Inscrições 2026
              </div>
              <h1 className="max-w-xl text-balance text-[clamp(2.8rem,4.3vw,4.75rem)] font-extrabold uppercase leading-[0.96] tracking-[0.015em] text-white">
                Sua clínica está pronta para o próximo nível?
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
                Participe da Imersão EscalaMED. A inscrição custa R$ 2.497,00. Com um cupom de convite válido, você participa gratuitamente.
              </p>
            </div>
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

        <section className="relative flex items-center px-4 pb-5 sm:px-8 sm:pb-8 lg:bg-[#F7FAFD] lg:px-12 lg:py-6 xl:px-16">
          <div aria-hidden="true" className="edge-mark absolute left-0 top-0 hidden h-full w-4 lg:block" />
          <div className="mx-auto w-full max-w-[650px]">
            <div className="mb-6 lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C69858]">Inscrições 2026</p>
              <h1 className="mt-3 max-w-xl text-[2.15rem] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-white sm:text-[2.75rem]">
                Sua clínica está pronta para o próximo nível?
              </h1>
            </div>

            <ApplicationForm />

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-white/55 lg:text-[#486176]">
              <ShieldCheck className="size-4 shrink-0 text-[#C69858]" />
              Seus dados são tratados com segurança e usados apenas pelo EscalaMED.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
