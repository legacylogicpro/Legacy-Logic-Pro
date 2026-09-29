import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Legacy Logic Pro — CA Document Intelligence & Practice Management',
  description: 'Document intelligence and practice management platform for Chartered Accountant firms in India',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-800 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
