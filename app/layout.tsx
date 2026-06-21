import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { StoreHydrator } from '@/lib/store';

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
        {/* Triggers client-only localStorage rehydration once. */}
        <StoreHydrator />
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar (hidden on small screens) */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          {/* Main column */}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
