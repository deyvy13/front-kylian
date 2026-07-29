import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/presentation/components/layout/ThemeProvider";
import { AppShell } from "@/presentation/components/layout/AppShell";
import { SessionProvider } from "@/presentation/components/auth/SessionProvider";
import { ToastProvider } from "@/presentation/components/ui/Toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kylian José — Gestión",
  description: "Control de productos, stock y ventas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <AppShell>{children}</AppShell>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
