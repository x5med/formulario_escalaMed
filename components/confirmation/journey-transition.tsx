"use client"

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react"

const clamp = (value: number) => Math.min(1, Math.max(0, value))

// Layout coordinates stay stable while the presentation layers move.
function layoutTop(element: HTMLElement) {
  let top = 0
  let current: HTMLElement | null = element
  while (current) {
    top += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return top
}

export function JourneyTransition({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const hero = main.querySelector<HTMLElement>(".confirmation")
    const steps = main.querySelector<HTMLElement>(".next-steps")
    const cards = Array.from(main.querySelectorAll<HTMLElement>(".step-checklist li"))
    if (!hero || !steps) return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let viewport = window.innerHeight
    let mobile = window.innerWidth <= 640
    let heroTop = 0
    let heroHeight = 1
    let stepsTop = 0
    let cardTops: number[] = []

    function render() {
      frame = 0
      if (motion.matches) return
      const scroll = window.scrollY
      const departure = clamp((scroll - heroTop) / heroHeight)
      const entrance = clamp((scroll + viewport * .9 - stepsTop) / (viewport * .4))
      const distance = mobile ? .4 : 1
      main!.style.setProperty("--ticket-drift", `${departure * 110 * distance}px`)
      main!.style.setProperty("--ticket-depth", `${1 - departure * .065 * distance}`)
      main!.style.setProperty("--ribbons-drift", `${-departure * 65 * distance}px`)
      main!.style.setProperty("--atmosphere-drift", `${departure * 160 * distance}px`)
      main!.style.setProperty("--heading-rise", `${(1 - entrance) * 38 * distance}px`)
      main!.style.setProperty("--heading-opacity", `${.55 + entrance * .45}`)
      cards.forEach((card, index) => {
        const delay = mobile ? 0 : index * 32
        const progress = clamp((scroll + viewport * .94 - cardTops[index] - delay) / (viewport * .34))
        card.style.setProperty("--card-rise", `${(1 - progress) * (mobile ? 30 : 76)}px`)
        card.style.setProperty("--card-opacity", `${.45 + progress * .55}`)
        card.style.setProperty("--card-turn", `${mobile ? 0 : (1 - progress) * (index - 1) * 3}deg`)
      })
    }

    function schedule() {
      if (!motion.matches && !frame) frame = requestAnimationFrame(render)
    }

    function measure() {
      viewport = window.innerHeight
      mobile = window.innerWidth <= 640
      heroTop = layoutTop(hero!)
      heroHeight = hero!.offsetHeight
      stepsTop = layoutTop(steps!)
      cardTops = cards.map(layoutTop)
      schedule()
    }

    function updateMotion() {
      cancelAnimationFrame(frame)
      frame = 0
      if (motion.matches) {
        delete main!.dataset.scrollMotion
      } else {
        measure()
        cancelAnimationFrame(frame)
        render()
        main!.dataset.scrollMotion = "true"
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(main)
    observer.observe(hero)
    observer.observe(steps)
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", measure, { passive: true })
    motion.addEventListener("change", updateMotion)
    updateMotion()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", measure)
      motion.removeEventListener("change", updateMotion)
      delete main.dataset.scrollMotion
    }
  }, [])

  function highlightCard(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !mainRef.current?.dataset.scrollMotion) return
    const card = (event.target as HTMLElement).closest<HTMLElement>(".step-card")
    if (!card) return
    const bounds = card.getBoundingClientRect()
    card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`)
    card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`)
  }

  return <div ref={mainRef} className="thank-you-main" onPointerMove={highlightCard}>{children}</div>
}
