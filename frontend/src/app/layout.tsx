import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'WeZards - Magical Mages Web3 Ecosystem | BNB Chain',
  description: 'Production-ready Web3 ecosystem on BNB Smart Chain. 5,000 unique Mages NFTs, $WEZ token, decentralized marketplace, and $1,000 BNB reward campaign.',
  keywords: ['WeZards', 'BNB Chain', 'NFT', 'Web3', 'Binance Agentic Wallet', 'Solidity', 'Crypto'],
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
