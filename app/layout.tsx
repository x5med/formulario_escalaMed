import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { ConsentBanner } from "@/components/consent-banner";
import { GTM_ID } from "@/lib/tracking";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const consentBootstrap = `(function(w,d){
  w.dataLayer=w.dataLayer||[];
  w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};
  var match=d.cookie.match(/(?:^|; )x5med_consent=([^;]*)/);
  var choice=match?decodeURIComponent(match[1]):'unknown';
  var granted=choice==='accepted';
  w.gtag('consent','default',{
    ad_storage:granted?'granted':'denied',
    analytics_storage:granted?'granted':'denied',
    ad_user_data:granted?'granted':'denied',
    ad_personalization:granted?'granted':'denied',
    functionality_storage:'granted',
    security_storage:'granted',
    wait_for_update:500
  });
  w.dataLayer.push({event:'consent_default',consent_choice:choice});
})(window,document);`;

export const metadata: Metadata = {
  title: "Inscrição EscalaMED 2026",
  description: "Garanta sua inscrição na Imersão EscalaMED 2026. Use um cupom de convite para participar gratuitamente.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: consentBootstrap }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body className={`${sora.variable} antialiased`}>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
