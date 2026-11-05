import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WeZards Ecosystem - Admin Command Center',
  description: 'Decoupled administrative portal for WeZards Web3 ecosystem on BNB Smart Chain',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-admin-bg text-gray-200">
        {children}
      </body>
    </html>
  );
}

