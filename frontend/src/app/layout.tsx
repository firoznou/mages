import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'WeZards - Magical Web3 Ecosystem | 5,000 NFTs & MAGES Token on BSC',
  description: 'Production-ready Web3 ecosystem on BNB Smart Chain. 5,000 unique 8-bit wizard NFTs, 21M fixed MAGES tokenomics, pro-rata presale, and verifiable random rewards.',
  keywords: ['WeZards', 'BNB Chain', 'NFT', 'MAGES Token', 'Web3', 'Binance Agentic Wallet', 'Solidity', 'Crypto'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
