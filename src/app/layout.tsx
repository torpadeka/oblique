import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Swiss neo-grotesque substitute for SuisseIntl — weight 300 is the display signature.
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Oblique — Prove creditworthiness, reveal nothing",
    template: "%s · Oblique",
  },
  description:
    "Oblique scores credit on the Terminal 3 Network. Sensitive financials never leave the confidential boundary — an agent with verifiable identity computes a score and issues a verifiable credential a lender can trust without seeing the raw data.",
  applicationName: "Oblique",
  authors: [{ name: "Oblique" }],
  keywords: [
    "confidential credit scoring",
    "Terminal 3",
    "Agent Auth SDK",
    "verifiable credentials",
    "TEE",
    "privacy",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="oblique-theme-v2"
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
