import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uptime Monitor Dashboard',
  description: 'Lightweight health dashboard and API gateway'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
