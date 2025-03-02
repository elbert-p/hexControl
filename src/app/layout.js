import { Analytics } from '@vercel/analytics/next';
import { PuzzleProvider } from "../context/puzzleContext";
import './globals.css';

export const metadata = {
  title: "Hex Control",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
};

export const viewport = {
  width: "device-width",
  minimumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA & Mobile Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hex Control" />
        <meta name="theme-color" content="#ffffff" />

        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#c6e2e9" }}>
        {/* 
          Applying safe-area insets ensures your background color fills the safe areas.
          You can also define these styles in your globals.css.
        */}
        <div
          style={{
            minHeight: "100vh",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <PuzzleProvider>
            {children}
          </PuzzleProvider>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
