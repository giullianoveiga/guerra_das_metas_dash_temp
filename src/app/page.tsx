'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/monthly');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-primary font-headline font-black text-2xl animate-pulse">
        CARREGANDO SISTEMA TÁTICO...
      </div>
    </div>
  );
}
