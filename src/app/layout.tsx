import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlatformProvider } from "@/components/providers/PlatformProvider";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinguaConnect — Comunidad Internacional de Intercambio de Idiomas (+18)",
  description:
    "Plataforma internacional para adultos donde practicar idiomas en tiempo real mediante chat con correcciones, notas de voz y videollamadas 1-a-1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <PlatformProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Cargando LinguaConnect...
              </div>
            }
          >
            <AppShell>
              <Suspense
                fallback={
                  <div className="p-8 text-center text-sm text-slate-500">
                    Cargando vista...
                  </div>
                }
              >
                {children}
              </Suspense>
            </AppShell>
          </Suspense>
        </PlatformProvider>
      </body>
    </html>
  );
}
