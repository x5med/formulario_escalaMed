"use client";

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdmitOneTicket from './confirmation/ui/admit-one-ticket';
import { JourneyTransition } from './confirmation/journey-transition';
import { HeroRibbons } from './confirmation/hero-ribbons';
import { SiteHeader } from './confirmation/site-header';
import { NextSteps } from './confirmation/next-steps';
import { ExternalLink, MessageCircle } from './confirmation/ui/icons';
import { sora, anton } from '@/lib/confirmation-fonts';
import type { CourseStep } from '@/lib/confirmation-types';

const teamUrl = 'https://wa.me/5579998287305?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20sobre%20minha%20inscri%C3%A7%C3%A3o%20no%20EscalaMED.';
const steps: CourseStep[] = [
  { number: '01', icon: 'email', title: 'Acompanhe seu WhatsApp', text: 'Nossa equipe vai analisar seu perfil e entrar em contato pelo WhatsApp informado. O time de Sucesso do Cliente compartilhará as informações e orientações para sua participação.' },
  { number: '02', icon: 'calendar', title: 'Reserve 27, 28 e 29 de novembro', text: 'Separe os três dias de 2026 na sua agenda para viver a imersão presencial. Se seus planos mudarem, avise nossa equipe.' },
  { number: '03', icon: 'location', title: 'Prepare sua chegada a Alphaville', text: 'O encontro será no Star Eventos Alphaville: Alameda Madeira, 222, Edifício Alfacon, salas 21 e 22, Alphaville — Barueri, SP.' },
];
type Props = { name?: string; receiptId?: string; processing?: string; onRestart?: () => void };

export function RegistrationSuccess({ name = '', receiptId = '', processing = '', onRestart }: Props) {
  const router = useRouter();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  const firstName = name.trim().split(' ')[0];
  const description = firstName
    ? `${firstName}, seu cupom foi aplicado e recebemos suas respostas. A equipe X5Med vai entrar em contato pelo WhatsApp com os próximos passos.`
    : 'Sua próxima etapa começa no EscalaMED. Siga as orientações para participar da imersão presencial em Alphaville, São Paulo.';
  function restart() {
    try { localStorage.removeItem(`x5med:checklist:escalamed-${receiptId || 'confirmation'}`); } catch { /* Browser storage is optional. */ }
    if (onRestart) onRestart();
    else router.push('/');
  }

  return (
    <div className="confirmation-reference"><div id="confirmation-top" data-reference-revision="0bc2798" data-confirmation-version="reference-v2" className={`registration-success page-shell course-escalamed ${sora.variable} ${anton.variable}`}>
      <div className="background" aria-hidden="true"><Image src="/assets/escalamed/fundo-azul-grid.png" alt="" fill priority quality={90} sizes="100vw" /></div>
      <div className="background-overlay" aria-hidden="true" />
      <SiteHeader courseName="EscalaMED — A Rota do Crescimento" courseType="Imersão presencial" supportUrl={teamUrl} brand="escalamed" />
      <JourneyTransition>
        <section className="confirmation" aria-labelledby="page-title">
          <div className="hero-backdrop" aria-hidden="true"><div className="hero-atmosphere" /></div>
          <HeroRibbons prefix="A Rota do Crescimento" courseName="Estratégia. Gestão. Crescimento." />
          <div className="ticket-depth-layer">
            <AdmitOneTicket className="confirmation-ticket" name="EscalaMED — A Rota do Crescimento" headline="Obrigado pela sua inscrição." description={description} stubText="Ingresso" watermark="2026" tone="escalamed" eventDetails={{ date: '27 a 29 de novembro de 2026', location: 'Alphaville, São Paulo' }} />
          </div>
        </section>
        <section id="success-next-steps" className="next-steps" aria-labelledby="next-steps-title">
          <div className="next-steps-heading">
            <div className="card-heading"><h2 id="next-steps-title">Seus próximos passos</h2><p>Agora que seu formulário foi recebido, veja como se preparar para o EscalaMED.</p></div>
            <a className="support-link support-link-first" href={teamUrl} target="_blank" rel="noopener noreferrer"><MessageCircle weight="duotone" aria-hidden="true" />Falar com a equipe EscalaMED<ExternalLink aria-hidden="true" /></a>
          </div>
          <NextSteps courseSlug={`escalamed-${receiptId || 'confirmation'}`} steps={steps} />
          <div className="confirmation-receipt">
            <button type="button" onClick={restart}>Cadastrar outra pessoa<ExternalLink aria-hidden="true" /></button>
            {receiptId && <p>Protocolo: {receiptId}{processing && processing !== 'applied' ? ' · Respostas recebidas; cadastro em conferência pela equipe.' : ''}</p>}
          </div>
        </section>
      </JourneyTransition>
      <footer><span>© 2026 X5 MED LTDA · CNPJ 20.754.312/0001-06</span><a href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a></footer>
    </div></div>
  );
}
