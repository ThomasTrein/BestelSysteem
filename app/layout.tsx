import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AccentColorProvider from './AccentColorProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KSA Bestelapp',
  description: 'Bestel eenvoudig bij evenementen van KSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <AccentColorProvider />
        {children}
      </body>
    </html>
  );
}
