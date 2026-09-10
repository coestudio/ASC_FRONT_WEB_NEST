import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals/index.css";
import {
  THEME_COOKIE_NAME,
  type ThemeMode,
} from "@/styles/globals/color-modes";
import { locales, isLocale, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(isLocale(lang) ? lang : defaultLocale);
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  const cookieStore = await cookies();
  const themeMode = (cookieStore.get(THEME_COOKIE_NAME)?.value ??
    "light") as ThemeMode;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      data-bs-theme={themeMode}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
