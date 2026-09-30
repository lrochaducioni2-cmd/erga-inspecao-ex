import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/session-provider";
import "./globals.css";

// IBM Plex (licença OFL, ver src/fonts/OFL.txt) servida pelo próprio app:
// não depende do Google Fonts no build nem no uso offline em campo.
const plexSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  src: [
    { path: "../fonts/IBMPlexSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSans-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSans-700.woff2", weight: "700", style: "normal" },
  ],
});

const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [{ path: "../fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" }],
});

export const metadata: Metadata = {
  title: "Inspeção Ex · ERGA",
  description: "Inventário e inspeção de equipamentos Ex (ABNT NBR IEC 60079-17).",
  appleWebApp: { capable: true, title: "Inspeção Ex", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#16405F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
