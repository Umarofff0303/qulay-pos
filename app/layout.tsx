import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/lib/providers';

export const metadata: Metadata = {
  title: 'ShopPOS',
  description: 'Do`kon va savdo nuqtasi uchun boshqaruv tizimi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
