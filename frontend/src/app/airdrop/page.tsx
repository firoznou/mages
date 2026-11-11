'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AirdropRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mages/airdrop');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090514] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold">Redirecting to MAGES Airdrop...</h2>
        <p className="text-sm text-gray-400">
          If you are not redirected automatically,{' '}
          <Link href="/mages/airdrop" className="text-emerald-400 hover:underline">
            click here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
