import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "سيف المعرفة | Sword of Knowledge — Real-Time Quiz Battle",
  description: "سيف المعرفة هي لعبة تحدي ثقافي مباشر. نافس أصدقاءك، استخدم القوى الخارقة، وتسلق المراتب. Sword of Knowledge is a real-time multiplayer quiz battle game.",
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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
