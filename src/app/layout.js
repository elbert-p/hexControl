import { Analytics } from '@vercel/analytics/next';
import { PuzzleProvider } from "../context/puzzleContext";
import './globals.css';


export const metadata = {
  title: "Hex Control",
};

export const viewport = {
  width: "device-width",
  minimumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
      <PuzzleProvider>
        {children}
      </PuzzleProvider>
      <Analytics />
      </body>
    </html>
  );
}
