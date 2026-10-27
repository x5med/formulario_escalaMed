import Image from "next/image"
import { ExternalLink, MessageCircle, ListChecks } from "./ui/icons"
import styles from "./site-header.module.css"

type SiteHeaderProps = {
  courseName: string
  courseType: string
  supportUrl: string
  brand?: "escalamed"
}

export function SiteHeader({ courseName, courseType, supportUrl, brand }: SiteHeaderProps) {
  const isEscalamed = brand === "escalamed"
  return (
    <header className={styles.header} data-brand={brand}>
      <div className={styles.identity}>
        <a className={styles.brand} href="#confirmation-top" aria-label={`${isEscalamed ? "EscalaMed" : "X5 MED"} — início da página`}>
          {isEscalamed
            ? <Image src="/assets/escalamed/logo-branca-seta-dourada.png" width={835} height={101} alt="EscalaMed" priority />
            : <Image src="/assets/x5-med-logo.svg" width={108} height={76} alt="X5 MED" priority />}
        </a>
        <div className={styles.course}>
          <span>{courseType}</span>
          <strong>{isEscalamed ? "A Rota do Crescimento" : courseName}</strong>
        </div>
      </div>
      <nav className={styles.navigation} aria-label="Navegação da página">
        <a className={styles.stepsLink} href="#success-next-steps"><ListChecks aria-hidden="true" />Próximos passos</a>
        <a
          className={styles.supportLink}
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a equipe pelo WhatsApp (abre em nova aba)"
        >
          <MessageCircle aria-hidden="true" />
          <span className={styles.desktopLabel}>Falar com a equipe</span>
          <span className={styles.mobileLabel}>Ajuda</span>
          <ExternalLink className={styles.arrow} aria-hidden="true" />
        </a>
      </nav>
    </header>
  )
}
