import { Analytics } from '@vercel/analytics/next';
import { PuzzleProvider } from "../context/puzzleContext";
import './globals.css';

export const metadata = {
  title: "Hex Control",
  // manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  minimumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Primary Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hex Control" />
        <meta name="theme-color" content="#c6e2e9" />

        {/* Link to the manifest file */}
        <link rel="manifest" href="/manifest.json" />

      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <PuzzleProvider>
          {children}
        </PuzzleProvider>
        <Analytics />
      </body>
    </html>
  );
}
