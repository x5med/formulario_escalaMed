"use client"

import { ArrowDown, SealCheck, Ticket, Key } from "./icons"
import Image from "next/image"
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import { cn } from "@/lib/utils"
import styles from "./admit-one-ticket.module.css"

const REF = 741

// Proportions from the supplied Admit One Ticket, including its perforated stub.
export const TICKET_GEOMETRY = {
  aspect: 741 / 425,
  cornerRadius: 25 / REF,
  notchRadius: 21 / REF,
  perforation: 562 / REF,
}

export const TICKET_PALETTES = {
  orange: { back: "#ef671c", ink: "#422511", watermark: "#ffdcbe" },
  gold: { back: "#cca054", ink: "#382811", watermark: "#fff0c9" },
  blue: { back: "#62afe0", ink: "#082b45", watermark: "#e5f5ff" },
  escalamed: { back: "#F7FAFD", ink: "#002647", watermark: "#FFFFFF" },
} as const

export type TicketTone = keyof typeof TICKET_PALETTES

export type AdmitOneTicketProps = {
  name: string
  headline: string
  description: string
  stubText: string
  watermark: string
  tone?: TicketTone
  className?: string
  tilt?: boolean
  eventDetails?: { date: string; location: string }
}

export function ticketClipPath(width: number, height: number, geometry = TICKET_GEOMETRY) {
  const r = geometry.cornerRadius * width
  const n = geometry.notchRadius * width
  const p = geometry.perforation * width

  return [
    `M ${r} 0`,
    `L ${p - n} 0`,
    `A ${n} ${n} 0 0 0 ${p + n} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 0 ${width - r} ${height}`,
    `L ${p + n} ${height}`,
    `A ${n} ${n} 0 0 0 ${p - n} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 0 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    "Z",
  ].join(" ")
}

export function AdmitOneTicket({
  name,
  headline,
  description,
  stubText,
  watermark,
  tone = "orange",
  className,
  tilt = true,
  eventDetails,
}: AdmitOneTicketProps) {
  const clipId = `ticket-${useId().replace(/:/g, "")}`
  const cardRef = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(true)
  const palette = TICKET_PALETTES[tone]

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateMotion = () => setReducedMotion(motion.matches)
    updateMotion()
    motion.addEventListener("change", updateMotion)

    return () => {
      motion.removeEventListener("change", updateMotion)
    }
  }, [])

  function resetTilt() {
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)"
    }
  }

  useEffect(() => {
    if (reducedMotion || !tilt) resetTilt()
  }, [reducedMotion, tilt])

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!tilt || reducedMotion || event.pointerType !== "mouse") return
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    card.style.transform = `perspective(1200px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`
  }

  const ticketStyle = {
    "--ticket-back": palette.back,
    "--ticket-ink": palette.ink,
    "--ticket-watermark": palette.watermark,
    "--ticket-clip": `url(#${clipId})`,
  } as CSSProperties

  return (
    <div className={cn(styles.wrapper, className)} data-ticket={tone}>
      <svg width="0" height="0" aria-hidden="true" className={styles.clipDefinition}>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={ticketClipPath(REF, 425)} transform={`scale(${1 / REF} ${1 / 425})`} />
          </clipPath>
        </defs>
      </svg>
      <div
        ref={cardRef}
        className={styles.tilt}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
      >
        <article className={styles.ticket} style={ticketStyle} aria-labelledby="page-title">
          <div className={styles.content}>
            <div className={styles.ticketHeader}>
              {tone === "escalamed"
                ? <Image className={styles.eventLogo} src="/assets/escalamed/logo-azul-seta-dourada.png" width={835} height={101} alt="EscalaMed" priority />
                : <span className={styles.logo} role="img" aria-label="X5 MED" />}
              <span className={styles.status}><SealCheck weight="duotone" aria-hidden="true" />Inscrição recebida</span>
            </div>
            <div className={styles.message}>
              <p className={styles.product}>{tone === "escalamed" ? "A Rota do Crescimento" : name}</p>
              <h1 id="page-title" tabIndex={-1} className={styles.headline}>{headline}</h1>
              <p className={styles.description}>{description}</p>
              {eventDetails && (
                <div className={styles.eventDetails}>
                  <span>{eventDetails.date}</span>
                  <span>{eventDetails.location}</span>
                </div>
              )}
            </div>
            <a className={styles.action} href="#success-next-steps">
              Ver próximos passos<ArrowDown aria-hidden="true" />
            </a>
          </div>

          <div className={styles.stub}>
            {watermark === "X5" ? (
              <span className={styles.watermarkLogo} aria-hidden="true" />
            ) : (
              <span className={styles.watermark} aria-hidden="true">{watermark}</span>
            )}
            <span className={styles.stubText}>{stubText === "Ingresso" ? <Ticket weight="duotone" aria-hidden="true" /> : <Key weight="duotone" aria-hidden="true" />}{stubText}</span>
            {tone === "escalamed"
              ? <Image className={styles.eventSeal} src="/assets/escalamed/selo-x5.png" width={157} height={157} alt="Realização X5 MED" />
              : <span className={styles.stubBrand} aria-hidden="true">X5 MED</span>}
          </div>
        </article>
      </div>
    </div>
  )
}

export default AdmitOneTicket
