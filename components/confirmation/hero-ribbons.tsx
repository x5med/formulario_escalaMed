"use client"

import { useEffect, useRef } from "react"

type HeroRibbonsProps = { courseName: string; prefix?: string }

export function HeroRibbons({ courseName, prefix = "X5 MED" }: HeroRibbonsProps) {
  const ribbonsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ribbons = ribbonsRef.current
    const hero = ribbons?.closest<HTMLElement>(".confirmation")
    if (!ribbons || !hero) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let pointerX = 0
    let pointerY = 0

    function reset() {
      cancelAnimationFrame(frame)
      frame = 0
      ribbons!.style.setProperty("--ribbon-x", "0px")
      ribbons!.style.setProperty("--ribbon-y", "0px")
      ribbons!.style.setProperty("--ribbon-turn", "0deg")
    }

    function move(event: PointerEvent) {
      if (reducedMotion.matches || event.pointerType !== "mouse") return
      pointerX = event.clientX
      pointerY = event.clientY
      if (frame) return

      frame = requestAnimationFrame(() => {
        frame = 0
        const bounds = hero!.getBoundingClientRect()
        if (!bounds.width || !bounds.height) return
        const x = Math.max(-1, Math.min(1, ((pointerX - bounds.left) / bounds.width - 0.5) * 2))
        const y = Math.max(-1, Math.min(1, ((pointerY - bounds.top) / bounds.height - 0.5) * 2))
        ribbons!.style.setProperty("--ribbon-x", `${x * 42}px`)
        ribbons!.style.setProperty("--ribbon-y", `${y * 18}px`)
        ribbons!.style.setProperty("--ribbon-turn", `${x * 1.4}deg`)
      })
    }

    reset()
    hero.addEventListener("pointermove", move, { passive: true })
    hero.addEventListener("pointerleave", reset)
    window.addEventListener("blur", reset)
    reducedMotion.addEventListener("change", reset)

    return () => {
      cancelAnimationFrame(frame)
      hero.removeEventListener("pointermove", move)
      hero.removeEventListener("pointerleave", reset)
      window.removeEventListener("blur", reset)
      reducedMotion.removeEventListener("change", reset)
    }
  }, [])

  return (
    <div ref={ribbonsRef} className="hero-ribbons" aria-hidden="true">
      {/* Aligned copies blend from sharp text into progressively softer edges. */}
      {(["sharp", "soft", "edge"] as const).map((layer) => (
        <div key={layer} className={`hero-ribbons-layer hero-ribbons-layer-${layer}`}>
          <div className="hero-ribbon hero-ribbon-accent">
            <div className="hero-ribbon-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="hero-ribbon-group">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index}>{prefix}<i />{courseName}<i /></span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="hero-ribbon hero-ribbon-dark">
            <div className="hero-ribbon-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="hero-ribbon-group">
                  {Array.from({ length: 8 }, (_, index) => (
                    <span key={index}>Seu próximo passo começa aqui<i /></span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
