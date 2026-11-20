import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo";
import "@fontsource-variable/outfit";
import "@fontsource-variable/newsreader";
import "./globals.css";
import { AccessibleShell } from "@/components/AccessibleShell";
import { ToastContainer } from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "سيف المعرفة | Sword of Knowledge — Real-Time Quiz Battle",
  description: "سيف المعرفة هي لعبة تحدي ثقافي مباشر. نافس أصدقاءك، استخدم القوى الخارقة، وتسلق المراتب. Sword of Knowledge is a real-time multiplayer quiz battle game.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
  openGraph: {
    title: "سيف المعرفة - Sword of Knowledge",
    description: "تحديات ثقافية مباشرة - Real-time multiplayer quiz battles",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101923",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <AccessibleShell>{children}</AccessibleShell>
        <ToastContainer />
      </body>
    </html>
  );
}
