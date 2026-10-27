"use client";

import { useEffect, useRef } from 'react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
function layoutTop(element: HTMLElement) {
  let top = 0;
  for (let current: HTMLElement | null = element; current; current = current.offsetParent as HTMLElement | null) top += current.offsetTop;
  return top;
}

/** Adapted from obrigado-x5med's JourneyTransition, HeroRibbons and ticket tilt.
 * Independent presentation layers prevent scroll, entry and pointer transforms colliding.
 */
export function useSuccessMotion() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const hero = root?.querySelector<HTMLElement>('.success-hero');
    const steps = root?.querySelector<HTMLElement>('.success-next-steps');
    if (!root || !hero || !steps) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.success-step'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0, viewport = 1, heroTop = 0, heroHeight = 1, stepsTop = 0;
    let mobile = false, cardTops: number[] = [];
    let pointer: { x: number; y: number; target: Element } | null = null;

    function render() {
      frame = 0;
      if (motion.matches) return;
      const scroll = window.scrollY;
      const departure = clamp((scroll - heroTop) / heroHeight);
      const entrance = clamp((scroll + viewport * .9 - stepsTop) / (viewport * .4));
      const distance = mobile ? .4 : 1;
      root!.style.setProperty('--ticket-drift', `${departure * 110 * distance}px`);
      root!.style.setProperty('--ticket-depth', `${1 - departure * .065 * distance}`);
      root!.style.setProperty('--ribbons-drift', `${-departure * 65 * distance}px`);
      root!.style.setProperty('--heading-rise', `${(1 - entrance) * 38 * distance}px`);
      root!.style.setProperty('--heading-opacity', `${.55 + entrance * .45}`);
      cards.forEach((card, index) => {
        const progress = clamp((scroll + viewport * .94 - cardTops[index] - (mobile ? 0 : index * 32)) / (viewport * .34));
        card.style.setProperty('--card-rise', `${(1 - progress) * (mobile ? 30 : 76)}px`);
        card.style.setProperty('--card-opacity', `${.45 + progress * .55}`);
        card.style.setProperty('--card-turn', `${mobile ? 0 : (1 - progress) * (index - 1) * 3}deg`);
      });
      if (!pointer || !finePointer.matches) return;
      if (hero!.contains(pointer.target)) {
        const bounds = hero!.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, ((pointer.x - bounds.left) / Math.max(1, bounds.width) - .5) * 2));
        const y = Math.max(-1, Math.min(1, ((pointer.y - bounds.top) / Math.max(1, bounds.height) - .5) * 2));
        root!.style.setProperty('--ribbon-x', `${x * 42}px`);
        root!.style.setProperty('--ribbon-y', `${y * 18}px`);
        root!.style.setProperty('--ribbon-turn', `${x * 1.4}deg`);
        const ticket = root!.querySelector<HTMLElement>('.success-ticket');
        if (ticket?.contains(pointer.target)) {
          const rect = ticket.getBoundingClientRect();
          root!.style.setProperty('--ticket-rotate-x', `${-((pointer.y - rect.top) / rect.height - .5) * 8}deg`);
          root!.style.setProperty('--ticket-rotate-y', `${((pointer.x - rect.left) / rect.width - .5) * 8}deg`);
        } else resetTilt();
      }
      const card = pointer.target.closest<HTMLElement>('.success-step');
      if (card) {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${pointer.x - bounds.left}px`);
        card.style.setProperty('--spot-y', `${pointer.y - bounds.top}px`);
      }
    }
    function schedule() { if (!motion.matches && !frame) frame = requestAnimationFrame(render); }
    function measure() {
      viewport = window.innerHeight;
      mobile = window.innerWidth <= 640;
      heroTop = layoutTop(hero!);
      heroHeight = Math.max(1, hero!.offsetHeight);
      stepsTop = layoutTop(steps!);
      cardTops = cards.map(layoutTop);
      schedule();
    }
    function resetTilt() {
      root!.style.setProperty('--ticket-rotate-x', '0deg');
      root!.style.setProperty('--ticket-rotate-y', '0deg');
    }
    function resetPointer() {
      pointer = null;
      resetTilt();
      for (const [key, value] of [['--ribbon-x', '0px'], ['--ribbon-y', '0px'], ['--ribbon-turn', '0deg']]) root!.style.setProperty(key, value);
    }
    function move(event: PointerEvent) {
      if (motion.matches || !finePointer.matches || event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
      pointer = { x: event.clientX, y: event.clientY, target: event.target };
      if (!hero!.contains(event.target)) resetTilt();
      schedule();
    }
    function updateMotion() {
      cancelAnimationFrame(frame);
      frame = 0;
      resetPointer();
      if (motion.matches) delete root!.dataset.scrollMotion;
      else { measure(); root!.dataset.scrollMotion = 'true'; }
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root); observer.observe(hero); observer.observe(steps);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('blur', resetPointer);
    hero.addEventListener('pointerleave', resetPointer);
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerleave', resetPointer);
    root.addEventListener('pointercancel', resetPointer);
    motion.addEventListener('change', updateMotion);
    finePointer.addEventListener('change', resetPointer);
    updateMotion();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure);
      window.removeEventListener('blur', resetPointer);
      hero.removeEventListener('pointerleave', resetPointer);
      root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', resetPointer); root.removeEventListener('pointercancel', resetPointer);
      motion.removeEventListener('change', updateMotion); finePointer.removeEventListener('change', resetPointer);
      delete root.dataset.scrollMotion;
    };
  }, []);
  return rootRef;
}

export function SuccessRibbons() {
  return <div className="success-ribbons" aria-hidden="true">
    {(['one', 'two'] as const).map((row) => <div key={row} className={`success-ribbon success-ribbon-${row}`}>
      <div className="success-ribbon-track">
        {[0, 1].map(copy => <div key={copy} className="success-ribbon-group">
          {Array.from({ length: 6 }, (_, index) => <span key={index}>{row === 'one' ? 'A Rota do Crescimento · Estratégia. Gestão. Crescimento.' : 'Seu próximo passo começa aqui · EscalaMED'}<i /></span>)}
        </div>)}
      </div>
    </div>)}
  </div>;
}
