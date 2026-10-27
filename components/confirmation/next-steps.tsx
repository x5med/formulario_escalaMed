"use client"

import {
  BookOpenCheck,
  CalendarDays,
  Check,
  Circle,
  CircleCheck,
  MailCheck,
  MonitorPlay,
  RotateCcw,
  ClipboardText,
  MapPin,
} from "./ui/icons"
import { useEffect, useRef, useState } from "react"
import type { CourseStep, StepIcon } from "@/lib/confirmation-types"

const stepIcons = {
  email: MailCheck,
  external: MonitorPlay,
  book: BookOpenCheck,
  calendar: CalendarDays,
  play: MonitorPlay,
  diagnostic: ClipboardText,
  location: MapPin,
} satisfies Record<StepIcon, typeof MailCheck>

type NextStepsProps = {
  courseSlug: string
  steps: CourseStep[]
}

export function NextSteps({ courseSlug, steps }: NextStepsProps) {
  const [completed, setCompleted] = useState<string[]>([])
  const resetRef = useRef<HTMLButtonElement>(null)
  const firstStepRef = useRef<HTMLButtonElement>(null)
  const storageKey = `x5med:checklist:${courseSlug}`

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]")
      if (Array.isArray(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the optional checklist after SSR, matching the reference.
        setCompleted(steps.map(({ number }) => number).filter((number) => saved.includes(number)))
      }
    } catch {
      // The checklist still works when browser storage is unavailable.
    }
  }, [storageKey, steps])

  function updateCompleted(next: string[]) {
    setCompleted(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Storage is optional; marking steps never depends on it.
    }
  }

  function toggleStep(number: string) {
    updateCompleted(completed.includes(number)
      ? completed.filter((value) => value !== number)
      : [...completed, number])
  }

  function resetChecklist() {
    if (document.activeElement === resetRef.current) firstStepRef.current?.focus()
    updateCompleted([])
  }

  return (
    <div className="step-checklist">
      <div className="checklist-progress">
        <div className="checklist-progress-copy">
          <p role="status" aria-live="polite" aria-atomic="true">
            {completed.length === steps.length ? <CircleCheck aria-hidden="true" /> : <Circle aria-hidden="true" />}
            {completed.length} de {steps.length} passos concluídos
          </p>
          <span>Marque cada etapa conforme concluir.</span>
        </div>
        <div className="checklist-progress-actions">
          <progress value={completed.length} max={steps.length} aria-label="Progresso do checklist" />
          {completed.length > 0 && (
            <button ref={resetRef} type="button" className="checklist-reset" onClick={resetChecklist}>
              <RotateCcw aria-hidden="true" />Limpar marcações
            </button>
          )}
        </div>
      </div>

      <ol role="list">
        {steps.map(({ number, title, text, icon }, index) => {
          const Icon = stepIcons[icon]
          const done = completed.includes(number)

          return (
            <li key={number}>
              <article className="step-card" data-completed={done}>
                <div className="step-card-heading">
                  <div className="step-icon"><Icon weight="duotone" aria-hidden="true" /></div>
                  <span className="step-number" aria-label={`Passo ${Number(number)}`}>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="step-card-action">
                  <button
                    ref={index === 0 ? firstStepRef : undefined}
                    type="button"
                    className="step-toggle"
                    aria-pressed={done}
                    aria-label={`${done ? "Desmarcar" : "Marcar como feito"}: ${title}`}
                    onClick={() => toggleStep(number)}
                  >
                    <span className="step-toggle-icon" aria-hidden="true">{done && <Check weight="bold" />}</span>
                    {done ? "Concluído" : "Marcar como feito"}
                  </button>
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
