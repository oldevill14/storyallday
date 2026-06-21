import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { StoreHydrator } from '@/lib/store';
import { AuthProvider } from '@/lib/auth';
import { AuthGate } from '@/components/AuthGate';
import { AppShell } from '@/components/AppShell';

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Story AI · ผู้ช่วยคอนเทนต์ประจำวัน',
  description: 'ผู้ช่วย AI สร้างคอนเทนต์สำหรับเจ้าของเพจ Facebook / Instagram / LINE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        {/* Triggers client-only rehydration (settings) + Firestore sync once. */}
        <StoreHydrator />
        <AuthProvider>
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
