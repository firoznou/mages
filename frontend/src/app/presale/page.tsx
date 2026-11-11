'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PresaleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mages/presale');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090514] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold">Redirecting to MAGES Public Presale...</h2>
        <p className="text-sm text-gray-400">
          If you are not redirected automatically,{' '}
          <Link href="/mages/presale" className="text-amber-400 hover:underline">
            click here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
