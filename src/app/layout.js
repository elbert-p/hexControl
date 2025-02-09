import { Analytics } from '@vercel/analytics/next';

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
        {children}
        <Analytics />

      </body>
    </html>
  );
}
