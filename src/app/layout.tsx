import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/Layout/AppShell";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "K9desk",
  description: "Premium mobile dog grooming management",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom on inputs
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                alert('JS Error: ' + e.message);
              });
              window.addEventListener('unhandledrejection', function(e) {
                alert('Promise Error: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)));
              });
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
