import localFont from "next/font/local"

export const sora = localFont({
  src: "../public/assets/escalamed/fonts/Sora.ttf",
  weight: "100 800",
  display: "swap",
  variable: "--font-escalamed-sora",
  preload: false,
})

export const anton = localFont({
  src: "../public/assets/escalamed/fonts/Anton.ttf",
  weight: "400",
  display: "swap",
  variable: "--font-escalamed-anton",
  preload: false,
})
