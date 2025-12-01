import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import { GlobalAnalysisNotification } from '@/components/GlobalAnalysisNotification';

export const metadata: Metadata = {
  title: 'KeepFit',
  description: '通过 AI 视觉识别食物热量，实时追踪每日热量赤字',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💪</text></svg>',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-white min-h-screen">
        <AnalysisProvider>
          {children}
          <GlobalAnalysisNotification />
        </AnalysisProvider>
      </body>
    </html>
  );
}

