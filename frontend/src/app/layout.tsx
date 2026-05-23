import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/layout/AuthProvider';

export const metadata: Metadata = {
  title: 'Notexa — Collaborative Note Taking',
  description: 'Create, share and collaborate on notes with friends in real-time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f8f9fc] text-gray-900 antialiased" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' } }} />
      </body>
    </html>
  );
}
