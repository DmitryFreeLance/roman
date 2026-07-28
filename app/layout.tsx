import type { Metadata, Viewport } from "next";
import { Manrope, Oswald } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["cyrillic", "latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#080808",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://poznaysebya.site"),
  title: "REDLINE CLUB — автотовары в Telegram",
  description:
    "Премиальный маркетплейс автотоваров и групповых закупок внутри Telegram.",
  icons: {
    icon: "/redlineclub/favicon.svg",
    shortcut: "/redlineclub/favicon.svg",
  },
  openGraph: {
    title: "REDLINE CLUB",
    description: "Автотовары. Проверенные продавцы. Выгодные групповые закупки.",
    images: [{ url: "/redlineclub/og.webp", width: 1672, height: 941 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "REDLINE CLUB",
    description: "Премиальный автомаркет внутри Telegram.",
    images: ["/redlineclub/og.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} ${oswald.variable}`}>
        <script
          src="https://telegram.org/js/telegram-web-app.js?63"
          data-redline-telegram="true"
          async
        />
        {children}
      </body>
    </html>
  );
}
