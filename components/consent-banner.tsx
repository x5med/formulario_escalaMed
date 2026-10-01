"use client";

import { useEffect, useState } from "react";

type ConsentChoice = "accepted" | "rejected" | "unknown";
type DataLayerWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const cookieName = "x5med_consent";
const oneYear = 60 * 60 * 24 * 365;

function readChoice(): ConsentChoice {
  const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "unknown";
  return value === "accepted" || value === "rejected" ? value : "unknown";
}

function storeChoice(choice: Exclude<ConsentChoice, "unknown">) {
  const sharedDomain = location.hostname === "x5med.com.br" || location.hostname.endsWith(".x5med.com.br");
  document.cookie = [
    `${cookieName}=${choice}`,
    "Path=/",
    `Max-Age=${oneYear}`,
    "SameSite=Lax",
    location.protocol === "https:" ? "Secure" : "",
    sharedDomain ? "Domain=.x5med.com.br" : "",
  ].filter(Boolean).join("; ");
}

function updateConsent(choice: Exclude<ConsentChoice, "unknown">) {
  const currentWindow = window as DataLayerWindow;
  currentWindow.dataLayer ||= [];
  currentWindow.gtag ||= (...args: unknown[]) => currentWindow.dataLayer?.push(args);
  const value = choice === "accepted" ? "granted" : "denied";
  currentWindow.gtag("consent", "update", {
    ad_storage: value,
    analytics_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
  currentWindow.dataLayer.push({ event: "consent_update", consent_choice: choice });
}

export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>("accepted");

  useEffect(() => {
    const timeout = window.setTimeout(() => setChoice(readChoice()), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  if (choice !== "unknown") return null;

  const choose = (nextChoice: Exclude<ConsentChoice, "unknown">) => {
    storeChoice(nextChoice);
    updateConsent(nextChoice);
    setChoice(nextChoice);
  };

  return (
    <aside className="consent-banner" role="dialog" aria-label="Preferências de privacidade" aria-live="polite">
      <div>
        <strong>Privacidade e medição</strong>
        <p>
          Usamos cookies de análise e publicidade para medir a experiência e melhorar nossas campanhas. Você
          pode aceitar ou continuar apenas com os cookies essenciais. Consulte nossa{" "}
          <a href="https://metrics.x5med.com.br/politica-de-privacidade" target="_blank" rel="noreferrer">
            Política de Privacidade
          </a>.
        </p>
      </div>
      <div className="consent-actions">
        <button type="button" className="consent-reject" onClick={() => choose("rejected")}>Recusar</button>
        <button type="button" className="consent-accept" onClick={() => choose("accepted")}>Aceitar</button>
      </div>
    </aside>
  );
}
